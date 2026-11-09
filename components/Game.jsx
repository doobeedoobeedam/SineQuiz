'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { COUNTRIES } from '../lib/countries';

const TOTAL = 20; // detik per scene
const MAX_BLUR = 14;

function Frame({ children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-md bg-film shadow-[0_20px_60px_-20px_rgba(91,108,255,0.5)] ring-1 ring-white/10 ${className}`}>
      <div className="sprockets" />
      <div className="relative aspect-video overflow-hidden">{children}</div>
      <div className="sprockets" />
    </div>
  );
}

function grade(n) {
  if (n >= 9) return 'Sinefil garis keras';
  if (n >= 7) return 'Anak Letterboxd sejati';
  if (n >= 4) return 'Penonton setia bioskop';
  return 'Nonton sambil scroll HP';
}

export default function Game() {
  const [phase, setPhase] = useState('intro'); // intro | loading | play | reveal | end | error
  const [country, setCountry] = useState('ALL');
  const [rounds, setRounds] = useState([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [left, setLeft] = useState(TOTAL);
  const [score, setScore] = useState(0);
  const [gain, setGain] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [log, setLog] = useState([]);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const deadline = useRef(0);
  const leftRef = useRef(TOTAL);

  const round = rounds[i];
  const countryName = COUNTRIES.find((c) => c.code === country)?.name;

  const beginRound = () => {
    deadline.current = Date.now() + TOTAL * 1000;
    leftRef.current = TOTAL;
    setLeft(TOTAL);
    setPicked(null);
    setPhase('play');
  };

  const start = async () => {
    setPhase('loading');
    try {
      const r = await fetch(`/api/quiz?country=${country}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.rounds?.length) throw new Error(d.error || 'Scene tidak berhasil dimuat');
      d.rounds.forEach((x) => { new Image().src = x.image; });
      setRounds(d.rounds);
      setI(0); setScore(0); setStreak(0); setBest(0); setLog([]);
      beginRound();
    } catch (e) {
      setErr(e.message);
      setPhase('error');
    }
  };

  const answer = useCallback(
    (choice) => {
      if (phase !== 'play') return;
      const ok = choice === round.answer;
      const pts = ok ? 100 + Math.round((leftRef.current / TOTAL) * 100) : 0;
      const n = ok ? streak + 1 : 0;
      setPicked(choice ?? '__timeout');
      setGain(pts);
      setScore((s) => s + pts);
      setStreak(n);
      setBest((b) => Math.max(b, n));
      setLog((l) => [...l, ok]);
      setPhase('reveal');
    },
    [phase, round, streak]
  );

  const next = useCallback(() => {
    if (i + 1 >= rounds.length) return setPhase('end');
    setI(i + 1);
    beginRound();
  }, [i, rounds.length]);

  useEffect(() => {
    if (phase !== 'play') return;
    const t = setInterval(() => {
      const l = Math.max(0, (deadline.current - Date.now()) / 1000);
      leftRef.current = l;
      setLeft(l);
      if (l <= 0) answer(null);
    }, 100);
    return () => clearInterval(t);
  }, [phase, answer]);

  useEffect(() => {
    const onKey = (e) => {
      if (phase === 'play') {
        const k = '1234abcd'.indexOf(e.key.toLowerCase());
        if (k > -1 && round?.options[k % 4]) answer(round.options[k % 4]);
      } else if (phase === 'reveal' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, round, answer, next]);

  const share = async () => {
    const text = `SineQuiz (${countryName}): ${score} poin\n${log.map((x) => (x ? '🟩' : '🟥')).join('')}\n${grade(log.filter(Boolean).length)}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };

  const btn = 'rounded-full bg-cream px-7 py-3 text-base font-semibold text-ink transition hover:bg-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink';
  const ghost = 'rounded-full border border-cream/30 px-7 py-3 font-semibold transition hover:border-pink hover:text-pink';

  if (phase === 'intro' || phase === 'loading' || phase === 'error') {
    const busy = phase === 'loading';
    return (
      <section className="grid min-h-0 flex-1 items-center gap-6 py-2 lg:grid-cols-2 lg:gap-12">
        <Frame className="-rotate-1">
          <div className="focus-in absolute inset-0 grid place-items-center bg-gradient-to-br from-volt via-[#8a4bd6] to-pink">
            <span className="font-serif text-[8rem] italic leading-none text-cream sm:text-[11rem]">?</span>
          </div>
        </Frame>
        <div className="flex flex-col gap-5">
          <h1 className="font-serif text-5xl italic leading-[1.05] lg:text-6xl">Film apa ini?</h1>
          <p className="max-w-md text-cream/70">
            Sampai 10 scene acak. Gambar mulai blur dan makin jelas seiring waktu. Tebak lebih awal, poinmu makin besar.
          </p>
          <div>
            <p className="mb-2 text-sm text-cream/60">Pilih negara film</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Negara asal film">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  role="radio"
                  aria-checked={country === c.code}
                  disabled={busy}
                  onClick={() => setCountry(c.code)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink ${
                    country === c.code ? 'border-cream bg-cream text-ink' : 'border-white/20 hover:border-pink'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          {phase === 'error' && <p className="rounded-xl bg-bad/15 px-4 py-2.5 text-sm text-bad">{err}</p>}
          <div>
            <button onClick={start} disabled={busy} className={`${btn} disabled:opacity-60`}>
              {busy ? 'Menggulung pita film...' : phase === 'error' ? 'Coba lagi' : 'Mulai nonton'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (phase === 'end') {
    const correct = log.filter(Boolean).length;
    return (
      <section className="flex min-h-0 flex-1 flex-col justify-center gap-5 py-4">
        <p className="text-cream/60">Credit roll, film {countryName}</p>
        <h2 className="font-serif text-6xl italic leading-none lg:text-8xl">{score} poin</h2>
        <p className="text-2xl font-semibold">{grade(correct)}</p>
        <p className="text-cream/70">{correct} dari {rounds.length} benar. Streak terpanjang: {best}.</p>
        <div className="flex max-w-md gap-1.5" aria-label="Hasil per scene">
          {log.map((ok, k) => (
            <span key={k} className={`h-3 flex-1 rounded-sm ${ok ? 'bg-ok' : 'bg-bad'}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={start} className={btn}>Main lagi</button>
          <button onClick={() => setPhase('intro')} className={ghost}>Ganti negara</button>
          <button onClick={share} className={ghost}>{copied ? 'Tersalin' : 'Salin hasil'}</button>
        </div>
      </section>
    );
  }

  const revealed = phase === 'reveal';
  const blur = revealed ? 0 : (left / TOTAL) * MAX_BLUR;

  return (
    <section className="grid min-h-0 flex-1 content-start gap-4 lg:grid-cols-[1.45fr_1fr] lg:content-center lg:items-center lg:gap-8">
      <div className="mx-auto w-full max-w-[300px] sm:max-w-[420px] lg:max-w-none">
        <Frame>
          <img
            src={round.image}
            alt="Scene dari sebuah film yang harus ditebak"
            className="h-full w-full object-cover transition-[filter] duration-200 ease-linear"
            style={{ filter: `blur(${blur}px)`, transform: blur ? 'scale(1.1)' : 'scale(1)' }}
          />
          {revealed && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-film to-transparent p-4 pt-12">
              <p className="font-serif text-2xl italic leading-tight sm:text-3xl">
                {round.answer} <span className="text-cream/60">{round.year}</span>
              </p>
            </div>
          )}
        </Frame>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-cream/70">Scene {i + 1} dari {rounds.length} &middot; {countryName}</span>
          <span className="flex items-center gap-3">
            {streak > 1 && <span className="rounded-full bg-pink/20 px-2.5 py-0.5 text-pink">{streak}x streak</span>}
            <span className="text-lg font-semibold tabular-nums">{score}</span>
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.ceil(left)} aria-valuemax={TOTAL}>
          <div className="h-full rounded-full bg-gradient-to-r from-pink to-volt" style={{ width: `${(left / TOTAL) * 100}%` }} />
        </div>

        <div className="grid gap-2 sm:gap-2.5">
          {round.options.map((o, k) => {
            const isAnswer = o === round.answer;
            const isPicked = o === picked;
            const state = !revealed
              ? 'border-white/15 bg-white/5 hover:border-pink hover:bg-white/10'
              : isAnswer
              ? 'border-ok bg-ok/15'
              : isPicked
              ? 'border-bad bg-bad/15'
              : 'border-white/10 bg-white/[0.03] opacity-50';
            return (
              <button
                key={o}
                disabled={revealed}
                onClick={() => answer(o)}
                className={`flex items-stretch overflow-hidden rounded-xl border text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink ${state}`}
              >
                <span className="grid w-11 shrink-0 place-items-center border-r-2 border-dashed border-white/20 font-serif text-xl italic">
                  {'ABCD'[k]}
                </span>
                <span className="px-3 py-2 text-sm font-medium leading-snug sm:px-4 sm:py-3 sm:text-base">{o}</span>
              </button>
            );
          })}
        </div>

        <div className="flex h-12 items-center justify-between gap-4">
          {revealed ? (
            <>
              <p className="font-semibold">
                {gain > 0 ? <span className="text-ok">+{gain} poin</span> : <span className="text-bad">{picked === '__timeout' ? 'Waktu habis' : 'Belum tepat'}</span>}
              </p>
              <button onClick={next} className={`${btn} py-2.5`}>{i + 1 >= rounds.length ? 'Lihat hasil' : 'Scene berikutnya'}</button>
            </>
          ) : (
            <p className="text-sm text-cream/40">Klik jawaban atau tekan A sampai D</p>
          )}
        </div>
      </div>
    </section>
  );
}
