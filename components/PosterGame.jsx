'use client';
import { useEffect, useRef, useState } from 'react';
import Media from './Media';
import Result, { btn, ghost } from './Result';

const FADE = 40; // detik sampai poster mencapai ketajaman maksimum

const clean = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
const stripArticle = (s) => s.replace(/^(the|a|an) /, '');

// benar kalau cocok dengan judul full/judul asli/subjudul setelah :
// (The Winter Soldier" = Captain America: The Winter Soldier)
function isRight(guess, film) {
  const q = stripArticle(clean(guess));
  if (q.length < 2) return false;
  const names = [];
  [film.answer, film.original].filter(Boolean).forEach((title) => {
    names.push(stripArticle(clean(title)));
    const sub = clean(title.split(':').slice(1).join(' '));
    if (sub.length >= 6) names.push(stripArticle(sub));
  });
  return names.includes(q);
}

export default function PosterGame({ t, lang, mode, badges, onGuess, onRun, onExit }) {
  const [phase, setPhase] = useState('loading'); // loading | error | play | reveal | end
  const [films, setFilms] = useState([]);
  const [i, setI] = useState(0);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [progress, setProgress] = useState(0); // 0 = baru muncul (kasar), 1 = paling tajam
  const [score, setScore] = useState(0);
  const [gain, setGain] = useState(0);
  const [log, setLog] = useState([]); // true = ditebak, false = menyerah
  const [err, setErr] = useState('');
  const startedAt = useRef(0);
  const film = films[i];
  const title = t.modes[mode].full;

  const beginFilm = () => {
    startedAt.current = Date.now();
    setProgress(0); setInput(''); setMsg('');
    setPhase('play');
  };

  const load = async () => {
    setPhase('loading');
    try {
      const res = await fetch(`/api/quiz?mode=${mode}&lang=${lang}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.rounds?.length) throw new Error(data.error || 'Error');
      setFilms(data.rounds);
      setI(0); setScore(0); setLog([]);
      beginFilm();
    } catch (e) {
      setErr(e.message);
      setPhase('error');
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { if (films[i + 1]) new Image().src = films[i + 1].image; }, [films, i]);

  useEffect(() => {
    if (phase !== 'play') return;
    const timer = setInterval(() => setProgress(Math.min(1, (Date.now() - startedAt.current) / (FADE * 1000))), 200);
    return () => clearInterval(timer);
  }, [phase]);

  const submit = (e) => {
    e.preventDefault();
    if (phase !== 'play') return;
    if (!isRight(input, film)) { setInput(''); return setMsg(t.tryAgain); }
    const points = 100 + Math.round((1 - progress) * 100);
    setGain(points);
    setScore((s) => s + points);
    setLog((l) => [...l, true]);
    onGuess({ key: mode, filmId: film.id, total: films.length }); // dihitung untuk lencana
    setPhase('reveal');
  };

  const giveUp = () => {
    if (phase !== 'play') return;
    setGain(0);
    setLog((l) => [...l, false]);
    setPhase('reveal');
  };

  const finish = () => {
    if (log.length) onRun(mode, Math.round((100 * log.filter(Boolean).length) / log.length));
    setPhase('end');
  };

  const next = () => (i + 1 >= films.length ? finish() : (setI(i + 1), beginFilm()));

  if (phase === 'loading') return <p className="m-auto text-lg text-cream/70">{t.loading}</p>;
  if (phase === 'error') {
    return (
      <div className="m-auto flex flex-col items-start gap-4">
        <p className="rounded-xl bg-bad/15 px-4 py-2.5 text-bad">{err}</p>
        <div className="flex gap-3">
          <button className={btn} onClick={load}>{t.retry}</button>
          <button className={ghost} onClick={onExit}>{t.menu}</button>
        </div>
      </div>
    );
  }
  if (phase === 'end') {
    const ok = log.filter(Boolean).length;
    return (
      <Result t={t} lang={lang} badges={badges} title={title} score={score} log={log} total={log.length}
        correct={ok} extra={t.guessedN(ok, films.length)} onAgain={load} onMenu={onExit} />
    );
  }

  const revealed = phase === 'reveal';

  return (
    <section className="grid min-h-0 flex-1 content-start gap-4 lg:grid-cols-[1.1fr_1fr] lg:content-center lg:items-center lg:gap-10">
      <div>
        <Media round={film} progress={progress} revealed={revealed} />
        <p className="mt-3 h-9 text-center font-serif text-2xl italic">
          {revealed && <>{film.answer} <span className="text-cream/60">{film.year}</span></>}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-serif text-2xl italic leading-tight">{t.modes[mode].prompt}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-cream/70">{t.filmOf(i + 1, films.length)}</span>
          <span className="text-lg font-semibold tabular-nums">{score}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-pink to-volt" style={{ width: `${(1 - progress) * 100}%` }} />
        </div>

        <form onSubmit={submit}>
          <input
            key={i}
            autoFocus
            value={input}
            disabled={revealed}
            onChange={(e) => { setInput(e.target.value); setMsg(''); }}
            placeholder={t.typeFilm}
            className="min-h-12 w-full rounded-xl border border-white/20 bg-white/5 px-5 outline-none placeholder:text-cream/40 focus:border-pink"
          />
          <p className="mt-1 h-5 px-2 text-sm text-bad">{msg}</p>
        </form>

        <div className="flex min-h-12 flex-wrap items-center gap-3">
          {revealed ? (
            <>
              <p className="mr-auto font-semibold">
                {gain > 0 ? <span className="text-ok">+{gain} {t.pts}</span> : <span className="text-bad">{t.wrong}</span>}
              </p>
              <button onClick={next} className={btn}>{i + 1 >= films.length ? t.seeResult : t.next}</button>
              <button onClick={finish} className={ghost}>{t.finish}</button>
            </>
          ) : (
            <>
              <button onClick={giveUp} className={ghost}>{t.giveUp}</button>
              <button onClick={finish} className={ghost}>{t.finish}</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
