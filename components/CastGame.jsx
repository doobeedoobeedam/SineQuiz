'use client';
// Ensemble Cast
// game over kalau waktu habis, salah tebak, atau menekan Menyerah.
import { useEffect, useRef, useState } from 'react';
import Result, { btn, ghost } from './Result';
import { clean, near } from '../lib/text';

const TOTAL = 90; // detik
const SKIP = ['de', 'la', 'le', 'da', 'di', 'du', 'van', 'von', 'bin', 'al', 'jr', 'sr', 'ii', 'iii']; // kata sambung nama

// index semua cast yang cocok dengan tebakan. satu kata sudah cukup ("chris" atau "evans")
// salah ketik satu huruf pun dimaafkan
function matches(guess, cast) {
  const q = clean(guess);
  if (q.length < 2 || SKIP.includes(q)) return [];
  return cast.map((_, k) => k).filter((k) => {
    const name = clean(cast[k].name);
    return ` ${name} `.includes(` ${q} `) || near(q, name) || (!q.includes(' ') && name.split(' ').some((w) => near(q, w)));
  });
}

export default function CastGame({ t, lang, country, badges, onExit }) {
  const [phase, setPhase] = useState('loading'); // loading | error | play | end
  const [film, setFilm] = useState(null);
  const [found, setFound] = useState([]); // index cast yang sudah ditebak
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState(null); // { ok, text }
  const [left, setLeft] = useState(TOTAL);
  const [reason, setReason] = useState(null); // 'timeout' | 'wrong' | 'giveup' | 'win'
  const [err, setErr] = useState('');
  const deadline = useRef(0);

  const load = async () => {
    setPhase('loading');
    try {
      const res = await fetch(`/api/cast?country=${country}&lang=${lang}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.rounds?.length) throw new Error(data.error || 'Error');
      setFilm(data.rounds[0]); // hanya satu film
      setFound([]); setInput(''); setMsg(null); setReason(null); setLeft(TOTAL);
      deadline.current = Date.now() + TOTAL * 1000;
      setPhase('play');
    } catch (e) {
      setErr(e.message);
      setPhase('error');
    }
  };

  const started = useRef(false);
  useEffect(() => { if (started.current) return; started.current = true; load(); }, []);

  const endGame = (why) => { setReason(why); setPhase('end'); };

  // waktu habis = game over
  useEffect(() => {
    if (phase !== 'play') return;
    const timer = setInterval(() => {
      const secs = Math.max(0, (deadline.current - Date.now()) / 1000);
      setLeft(secs);
      if (secs <= 0) endGame('timeout');
    }, 200);
    return () => clearInterval(timer);
  }, [phase]);

  // semua cast tertebak = menang
  useEffect(() => {
    if (phase === 'play' && film && found.length === film.cast.length) endGame('win');
  }, [found]);

  const submit = (e) => {
    e.preventDefault();
    if (phase !== 'play' || clean(input).length < 2) return;
    const hits = matches(input, film.cast);
    const fresh = hits.find((k) => !found.includes(k));
    setInput('');
    if (fresh !== undefined) {
      setFound([...found, fresh]);
      return setMsg({ ok: true, text: `${t.hit} ${film.cast[fresh].name}` });
    }
    if (hits.length) return setMsg({ ok: false, text: t.already }); // sudah disebut = tidak dihukum
    setMsg({ ok: false, text: t.miss }); // salah = tidak game over, lanjut menebak
  };

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

  const cast = film.cast;

  if (phase === 'end') {
    const why = { timeout: t.timeout, wrong: t.reasonWrong, giveup: t.reasonGiveUp }[reason];
    return (
      <Result
        t={t} lang={lang} badges={badges} minimal
        title={t.modes.cast.name}
        hero={{ photo: film.poster, name: `${film.title} (${film.year})` }}
        score={found.length * 100}
        correct={found.length} total={cast.length}
        log={cast.map((_, k) => found.includes(k))}
        summary={t.castResult(found.length, cast.length)}
        note={reason === 'win' ? { text: t.allCast, ok: true } : { text: `${t.gameOver} · ${why}`, ok: false }}
        jab={reason !== 'win' && found.length < cast.length / 2 ? { text: t.jabCast, ok: false } : null}
        onAgain={load} onMenu={onExit}
      />
    );
  }

  return (
    <section className="grid min-h-0 flex-1 content-start gap-4 lg:grid-cols-[1fr_1.2fr] lg:content-center lg:items-center lg:gap-10">
      <div>
        <img src={film.poster} alt="" className="mx-auto h-[min(54dvh,440px)] w-auto rounded-md ring-1 ring-white/10" />
        <p className="mt-3 h-9 text-center font-serif text-2xl italic">
          {film.title} <span className="text-cream/60">{film.year}</span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-serif text-2xl italic leading-tight">{t.modes.cast.prompt}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-cream/70">{t.foundN(found.length)}</span>
          <span className="text-lg font-semibold tabular-nums">{found.length * 100}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-pink to-volt" style={{ width: `${(left / TOTAL) * 100}%` }} />
        </div>

        <form onSubmit={submit}>
          <input
            autoFocus
            value={input}
            onChange={(e) => { setInput(e.target.value); setMsg(null); }}
            placeholder={t.typeName}
            className="min-h-12 w-full rounded-xl border border-white/20 bg-white/5 px-5 outline-none placeholder:text-cream/40 focus:border-pink"
          />
          <p className={`mt-1 h-5 px-2 text-sm ${msg?.ok ? 'text-ok' : 'text-bad'}`}>{msg?.text}</p>
        </form>

        <div className="flex max-h-[26dvh] min-h-24 flex-wrap content-start gap-2 overflow-y-auto">
          {found.map((k) => (
            <span key={cast[k].name} className="flex items-center gap-2 rounded-full border border-ok bg-ok/15 py-1 pl-1 pr-3 text-sm font-medium">
              {cast[k].photo
                ? <img src={cast[k].photo} alt="" className="h-7 w-7 rounded-full object-cover" />
                : <span className="h-7 w-7 rounded-full bg-white/10" />}
              {cast[k].name}
            </span>
          ))}
        </div>

        <div className="flex min-h-12 flex-wrap items-center gap-3">
          <button onClick={() => endGame('giveup')} className={ghost}>{t.giveUp}</button>
          <p className="text-xs text-cream/50">{t.suddenHint}</p>
        </div>
      </div>
    </section>
  );
}
