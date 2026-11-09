'use client';
// Guess the Actor
import { useEffect, useRef, useState } from 'react';
import Result, { btn, ghost } from './Result';
import { clean, near } from '../lib/text';

const TOTAL = 30;
const SKIP = ['de', 'la', 'le', 'da', 'di', 'du', 'van', 'von', 'bin', 'al', 'jr', 'sr', 'ii', 'iii'];

// tebakan yang dianggap benar -> nama lengkap, satu kata, atau salah ketik satu huruf
function isActor(guess, name) {
  const q = clean(guess);
  if (q.length < 2 || SKIP.includes(q)) return false;
  const n = clean(name);
  return ` ${n} `.includes(` ${q} `) || near(q, n) || (!q.includes(' ') && n.split(' ').some((w) => near(q, w)));
}

export default function ActorGame({ t, lang, onExit }) {
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

  const beginRound = () => {
    deadline.current = Date.now() + TOTAL * 1000;
    leftRef.current = TOTAL;
    setLeft(TOTAL); setInput(''); setMsg(null); setGain(0);
    setPhase('play');
  };

  const load = async () => {
    setPhase('loading');
    try {
      const res = await fetch(`/api/actorguess?lang=${lang}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.rounds?.length) throw new Error(data.error || 'Error');
      data.rounds.forEach((r) => { if (r.photo) new Image().src = r.photo; });
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
    if (isActor(input, round.name)) {
      setMsg({ ok: true, text: t.hit });
      return finish(true, 100 + Math.round((leftRef.current / TOTAL) * 100));
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
      <Result t={t} lang={lang} title={t.modes.actorGuess.name} score={score} log={log} total={rounds.length}
        correct={log.filter(Boolean).length} onAgain={load} onMenu={onExit} />
    );
  }

  const revealed = phase === 'reveal';

  return (
    <section className="mx-auto grid w-full max-w-5xl flex-1 content-center gap-6 py-2 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12">
      {/* kiri: 3 film */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {round.films.map((f) => (
          <div key={f.id} className="flex flex-col items-center text-center">
            {/* judul dikunci tingginya (2 baris), dibuat rata bawah supaya poster sejajar */}
            <div className="flex h-[3rem] w-full items-end justify-center sm:h-[3.4rem]">
              <p className="line-clamp-2 font-serif text-sm italic leading-tight sm:text-lg">{f.title}</p>
            </div>
            <p className="mt-1 text-[11px] text-cream/50 sm:text-xs">{f.year}</p>
            <img
              src={f.poster}
              alt=""
              className="mt-2 aspect-[2/3] w-full max-w-[180px] rounded-md object-cover ring-1 ring-white/10"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-cream/60 sm:text-sm">
          <span>{t.sceneOf(i + 1, rounds.length)}</span>
          <span className="text-base font-semibold tabular-nums text-cream sm:text-lg">{score} {t.pts}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10 sm:h-1.5">
          <div className="h-full rounded-full bg-gradient-to-r from-pink to-volt" style={{ width: `${(left / TOTAL) * 100}%` }} />
        </div>

        <p className="font-serif text-xl italic leading-snug sm:text-2xl">{t.modes.actorGuess.prompt}</p>

        {!revealed ? (
          <form onSubmit={submit} className="flex flex-col gap-2">
            <input
              key={i}
              autoFocus
              value={input}
              onChange={(e) => { setInput(e.target.value); setMsg(null); }}
              placeholder={t.modes.actorGuess.placeholder}
              className="min-h-12 w-full rounded-xl border border-white/20 bg-white/5 px-4 outline-none placeholder:text-cream/40 focus:border-pink sm:px-5"
            />
            <p className={`h-5 text-sm ${msg?.ok ? 'text-ok' : 'text-bad'}`}>{msg?.text}</p>
          </form>
        ) : (
          <div className="flex items-center gap-4">
            <img src={round.photo} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover ring-1 ring-white/15 sm:h-24 sm:w-20" />
            <div>
              <p className="text-sm text-cream/60">{t.modes.actorGuess.answer}</p>
              <p className="font-serif text-xl italic sm:text-2xl">{round.name}</p>
            </div>
          </div>
        )}

        <div className="flex min-h-12 flex-wrap items-center justify-between gap-3">
          {revealed ? (
            <>
              <p className="text-sm font-semibold sm:text-base">
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
