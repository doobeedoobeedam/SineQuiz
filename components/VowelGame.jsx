'use client';
// Titles Without Vowels
import { useEffect, useRef, useState } from 'react';
import Result, { btn, ghost } from './Result';
import { clean, stripArticle } from '../lib/text';

const TOTAL = 30;

// jawaban benar -> sama dengan judul (tanpa tanda baca & "the")
function isTitle(guess, answer, level) {
  const q = stripArticle(clean(guess));
  const a = stripArticle(clean(answer));
  if (!q) return false;
  if (level === 'hard') return q.replace(/ /g, '') === a.replace(/ /g, '');
  return q === a;
}

export default function VowelGame({ t, lang, level = 'easy', onExit }) {
  const [phase, setPhase] = useState('loading'); // loading | error | play | reveal | end
  const [rounds, setRounds] = useState([]);
  const [i, setI] = useState(0);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState(null);
  const [left, setLeft] = useState(TOTAL);
  const [gain, setGain] = useState(0);
  const [score, setScore] = useState(0);
  const [log, setLog] = useState([]);
  const [err, setErr] = useState('');
  const deadline = useRef(0);
  const leftRef = useRef(TOTAL);
  const round = rounds[i];
  const base = level === 'hard' ? 150 : 100; // mode hard ngasih poin lebih besar

  const beginRound = () => {
    deadline.current = Date.now() + TOTAL * 1000;
    leftRef.current = TOTAL;
    setLeft(TOTAL); setInput(''); setMsg(null); setGain(0);
    setPhase('play');
  };

  const load = async () => {
    setPhase('loading');
    try {
      const res = await fetch(`/api/vowel?level=${level}&lang=${lang}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.rounds?.length) throw new Error(data.error || 'Error');
      setRounds(data.rounds);
      setI(0); setScore(0); setLog([]);
      beginRound();
    } catch (e) {
      setErr(e.message);
      setPhase('error');
    }
  };

  const started = useRef(false);
  useEffect(() => { if (started.current) return; started.current = true; load(); }, []);

  const finish = (ok, pts) => {
    if (phase !== 'play') return;
    setGain(pts);
    setScore((s) => s + pts);
    setLog((l) => [...l, ok]);
    setPhase('reveal');
  };

  const submit = (e) => {
    e.preventDefault();
    if (phase !== 'play' || clean(input).length < 2) return;
    if (isTitle(input, round.answer, level)) {
      setMsg({ ok: true, text: t.hit });
      return finish(true, base + Math.round((leftRef.current / TOTAL) * 100));
    }
    setInput('');
    setMsg({ ok: false, text: t.tryAgain });
  };

  useEffect(() => {
    if (phase !== 'play') return;
    const timer = setInterval(() => {
      const secs = Math.max(0, (deadline.current - Date.now()) / 1000);
      leftRef.current = secs;
      setLeft(secs);
      if (secs <= 0) finish(false, 0);
    }, 100);
    return () => clearInterval(timer);
  }, [phase]);

  const next = () => (i + 1 >= rounds.length ? setPhase('end') : (setI(i + 1), beginRound()));

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
    return (
      <Result t={t} lang={lang} title={`${t.modes.vowel.name} · ${t.modes.vowel.levels[level]}`} score={score} log={log} total={rounds.length}
        correct={log.filter(Boolean).length} onAgain={load} onMenu={onExit} />
    );
  }

  const revealed = phase === 'reveal';

  return (
    <section className="grid min-h-0 flex-1 content-start gap-6 lg:content-center">
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-md bg-film px-6 py-10 ring-1 ring-white/10 sm:min-h-[280px]">
        <p className="text-center font-serif text-4xl italic leading-tight tracking-wide sm:text-6xl">{round.masked}</p>
        {revealed && (
          <p className="text-center text-lg text-cream/70">
            {round.answer} <span className="text-cream/50">{round.year}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-serif text-2xl italic leading-tight">{t.modes.vowel.prompt}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-cream/70">{t.sceneOf(i + 1, rounds.length)} · {t.modes.vowel.levels[level]}</span>
          <span className="text-lg font-semibold tabular-nums">{score}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-pink to-volt" style={{ width: `${(left / TOTAL) * 100}%` }} />
        </div>

        {!revealed && (
          <form onSubmit={submit}>
            <input
              key={i}
              autoFocus
              value={input}
              onChange={(e) => { setInput(e.target.value); setMsg(null); }}
              placeholder={t.modes.vowel.placeholder}
              className="min-h-12 w-full rounded-xl border border-white/20 bg-white/5 px-5 outline-none placeholder:text-cream/40 focus:border-pink"
            />
            <p className={`mt-1 h-5 px-2 text-sm ${msg?.ok ? 'text-ok' : 'text-bad'}`}>{msg?.text}</p>
          </form>
        )}

        <div className="flex min-h-12 items-center justify-between gap-3">
          {revealed ? (
            <>
              <p className="font-semibold">
                {gain > 0 ? <span className="text-ok">+{gain} {t.pts}</span> : <span className="text-bad">{t.timeout}</span>}
              </p>
              <button onClick={next} className={btn}>{i + 1 >= rounds.length ? t.seeResult : t.next}</button>
            </>
          ) : (
            <>
              <button onClick={() => finish(false, 0)} className={ghost}>{t.giveUp}</button>
              <span className="text-sm tabular-nums text-cream/50">{Math.ceil(left)}s</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
