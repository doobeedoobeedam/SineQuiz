'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Media from './Media';
import Result, { btn, ghost } from './Result';
import { SETS } from '../lib/badges';

const TOTAL = 20; // detik per soal

export default function QuizGame({ t, lang, mode, country, onWin, onExit }) {
  const [phase, setPhase] = useState('loading'); // loading | error | play | reveal | end
  const [rounds, setRounds] = useState([]);
  const [heroImg, setHeroImg] = useState(null); // foto/logo Marvel atau Nolan untuk layar hasil
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [left, setLeft] = useState(TOTAL);
  const [score, setScore] = useState(0);
  const [gain, setGain] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [log, setLog] = useState([]);
  const [stopped, setStopped] = useState(false); // berhenti lewat tombol Enough
  const [err, setErr] = useState('');
  const deadline = useRef(0);
  const leftRef = useRef(TOTAL);
  const reported = useRef(false);
  const round = rounds[i];
  const isPoster = mode === 'mcu' || mode === 'nolan';
  const modeName = t.modes[mode].full || t.modes[mode].name;
  const studioName = t.studio[mode]; // 'Marvel' / 'Christopher Nolan' (nama di bawah foto)
  const heroBg = mode === 'mcu' ? '#ffffff' : undefined; // logo Marvel (putih)

  const beginRound = () => {
    deadline.current = Date.now() + TOTAL * 1000;
    leftRef.current = TOTAL;
    setLeft(TOTAL);
    setPicked(null);
    setPhase('play');
  };

  const load = async () => {
    reported.current = false;
    setPhase('loading');
    try {
      const res = await fetch(`/api/quiz?mode=${mode}&country=${country}&lang=${lang}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.rounds?.length) throw new Error(data.error || 'Error');
      data.rounds.forEach((r) => { if (r.image) new Image().src = r.image; });
      setRounds(data.rounds);
      setHeroImg(data.hero || null);
      setI(0); setScore(0); setStreak(0); setBest(0); setLog([]); setStopped(false);
      beginRound();
    } catch (e) {
      setErr(e.message);
      setPhase('error');
    }
  };

  const started = useRef(false);
  useEffect(() => { if (started.current) return; started.current = true; load(); }, []);

  // sesi selesai (habis atau Enough) = simpan nilai rapor sekali aja
  useEffect(() => {
    if (phase !== 'end' || stopped || !isPoster || reported.current) return;
    reported.current = true;
    if (rounds.length && log.filter(Boolean).length === rounds.length) onWin?.(mode);
  }, [phase]);

  // dipanggil saat user memilih jawaban (atau null kalau waktu habis)
  const answer = useCallback((choice) => {
    if (phase !== 'play') return;
    const ok = choice === round.answer;
    const points = ok ? 100 + Math.round((leftRef.current / TOTAL) * 100) : 0;
    const newStreak = ok ? streak + 1 : 0;
    setPicked(choice ?? '__timeout');
    setGain(points);
    setScore((s) => s + points);
    setStreak(newStreak);
    setBest((b) => Math.max(b, newStreak));
    setLog((l) => [...l, ok]);
    setPhase('reveal');
  }, [phase, round, streak]);

  const next = useCallback(() => {
    if (i + 1 >= rounds.length) return setPhase('end');
    setI(i + 1);
    beginRound();
  }, [i, rounds.length]);

  // tombol Enough -> berhenti kapan aja, hanya skor (tanpa badge)
  const enough = () => {
    setStopped(true);
    setPhase('end');
  };

  useEffect(() => {
    if (phase !== 'play') return;
    const timer = setInterval(() => {
      const secs = Math.max(0, (deadline.current - Date.now()) / 1000);
      leftRef.current = secs;
      setLeft(secs);
      if (secs <= 0) answer(null);
    }, 100);
    return () => clearInterval(timer);
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
    if (isPoster) {
      if (stopped) {
        return (
          <Result t={t} lang={lang} title={modeName} score={score} log={log} total={rounds.length} correct={ok}
            summary={t.correctFilms(ok, rounds.length)} minimal
            note={{ text: `${t.gameOver} · ${t.reasonGiveUp}`, ok: false }}
            jab={{ text: t.jabStudio(studioName), ok: false }}
            hero={heroImg ? { photo: heroImg, name: studioName, bg: heroBg } : undefined}
            onAgain={load} onMenu={onExit} />
        );
      }
      const pct = rounds.length ? Math.round((100 * ok) / rounds.length) : 0;
      const tier = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
      return (
        <Result t={t} lang={lang} title={modeName} score={score} log={log} total={rounds.length} correct={ok}
          summary={t.correctFilms(ok, rounds.length)} extra={`${t.bestStreak}: ${best}`}
          jab={{ text: t.posterPraiseStudio[mode][tier], ok: tier >= 2 }}
          hero={heroImg ? { photo: heroImg, name: studioName, bg: heroBg } : undefined}
          badges={ok === rounds.length && rounds.length ? SETS.filter((b) => b.key === mode) : []}
          onAgain={load} onMenu={onExit} />
      );
    }
    return (
      <Result t={t} lang={lang} title={modeName} score={score} log={log} total={rounds.length} correct={ok}
        extra={`${t.bestStreak}: ${best}`} onAgain={load} onMenu={onExit} />
    );
  }

  const revealed = phase === 'reveal';

  return (
    <section className="grid min-h-0 flex-1 content-start gap-4 lg:grid-cols-[1.45fr_1fr] lg:content-center lg:items-center lg:gap-8">
      <div>
        <Media round={round} progress={1 - left / TOTAL} revealed={revealed} />
        <p className="mt-3 h-9 text-center font-serif text-2xl italic">
          {revealed && <>{round.answer} <span className="text-cream/60">{round.year}</span></>}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-serif text-2xl italic leading-tight">{t.modes[mode].prompt}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-cream/70">{t.sceneOf(i + 1, rounds.length)}</span>
          <span className="flex items-center gap-3">
            {streak > 1 && <span className="rounded-full bg-pink/20 px-2.5 py-0.5 text-pink">{streak}x {t.streak}</span>}
            <span className="text-lg font-semibold tabular-nums">{score}</span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.ceil(left)} aria-valuemax={TOTAL}>
          <div className="h-full rounded-full bg-gradient-to-r from-pink to-volt" style={{ width: `${(left / TOTAL) * 100}%` }} />
        </div>

        <div className="grid gap-2.5">
          {round.options.map((option, k) => {
            const isAnswer = option === round.answer;
            const state = !revealed
              ? 'border-white/15 bg-white/5 hover:border-pink hover:bg-white/10'
              : isAnswer ? 'border-ok bg-ok/15'
              : option === picked ? 'border-bad bg-bad/15'
              : 'border-white/10 bg-white/[0.03] opacity-50';
            return (
              <button
                key={option}
                disabled={revealed}
                onClick={() => answer(option)}
                className={`flex items-stretch overflow-hidden rounded-xl border text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink ${state}`}
              >
                <span className="grid w-11 shrink-0 place-items-center border-r-2 border-dashed border-white/20 font-serif text-xl italic">{'ABCD'[k]}</span>
                <span className="px-4 py-3 font-medium leading-snug">{option}</span>
              </button>
            );
          })}
        </div>

        {revealed && (
          <p className="h-6 font-semibold">
            {gain > 0
              ? <span className="text-ok">+{gain} {t.pts}</span>
              : <span className="text-bad">{picked === '__timeout' ? t.timeout : t.wrong}</span>}
          </p>
        )}

        <div className="flex min-h-12 items-center justify-between gap-3">
          {isPoster
            ? <button onClick={enough} className={ghost}>{t.enough}</button>
            : <span />}
          {revealed
            ? <button onClick={next} className={btn}>{i + 1 >= rounds.length ? t.seeResult : t.next}</button>
            : <p className="text-right text-sm text-cream/40">{t.hint}</p>}
        </div>
      </div>
    </section>
  );
}
