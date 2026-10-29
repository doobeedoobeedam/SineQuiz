'use client';
// Tebak Film Aktor
// game over kalau waktu habis, salah tebak, atau menekan Menyerah.
// semua film tertebak sebelum waktu habis = badge "Fans Garis Keras [aktor]"
import { useEffect, useRef, useState } from 'react';
import Result, { btn, ghost } from './Result';
import { clean, near, stripArticle } from '../lib/text';
import { actorBadge } from '../lib/badges';

// index film yang cocok dengan tebakan, urut dari yang paling pas
// 1) judul persis sama  2) beda satu huruf (salah ketik)  3) awal judul ("mission impossible")
function matches(guess, films) {
  const q = stripArticle(clean(guess));
  if (q.length < 2) return [];
  const names = (f) => [f.title, f.original].filter(Boolean).map((n) => stripArticle(clean(n)));
  const all = films.map((_, k) => k);
  const exact = all.filter((k) => names(films[k]).some((n) => n === q));
  const typo = all.filter((k) => names(films[k]).some((n) => n !== q && near(q, n)));
  const prefix = q.length >= 6 ? all.filter((k) => names(films[k]).some((n) => n.startsWith(`${q} `))) : [];
  return [...exact, ...typo, ...prefix];
}

export default function FilmoGame({ t, lang, onActor, onExit }) {
  const [phase, setPhase] = useState('loading'); // loading | error | play | end
  const [actor, setActor] = useState(null);
  const [found, setFound] = useState([]); // index film yang sudah ditebak
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState(null); // { ok, text }
  const [left, setLeft] = useState(0);
  const [limit, setLimit] = useState(0); // batas waktu (detik)
  const [reason, setReason] = useState(null); // 'timeout' | 'wrong' | 'giveup' | 'win'
  const [err, setErr] = useState('');
  const deadline = useRef(0);
  const foundRef = useRef([]); // salinan 'found' untuk dibaca di dalam timer
  const ended = useRef(false);
  const seen = useRef(new Set()); // id aktor yang sudah tampil di sesi browser ini

  const load = async () => {
    setPhase('loading');
    try {
      // kirim id aktor yang sudah tampil di sesi ini supaya tidak berulang
      const ex = [...seen.current].slice(-80).join(',');
      const res = await fetch(`/api/filmo?exclude=${ex}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.rounds?.length) throw new Error(data.error || 'Error');
      const a = data.rounds[0]; // hanya satu aktor
      seen.current.add(String(a.id));
      const secs = a.films.length * 10 + 60; // 10 detik per film + 60 detik tambahan
      setActor(a); setLimit(secs); setLeft(secs);
      setFound([]); foundRef.current = []; setInput(''); setMsg(null); setReason(null);
      ended.current = false;
      deadline.current = Date.now() + secs * 1000;
      setPhase('play');
    } catch (e) {
      setErr(e.message);
      setPhase('error');
    }
  };

  const started = useRef(false);
  useEffect(() => { if (started.current) return; started.current = true; load(); }, []);
  useEffect(() => { foundRef.current = found; }, [found]);

  // akhiri sesi (sekali saja), simpan hasil & badge
  const endGame = (why) => {
    if (ended.current) return;
    ended.current = true;
    const count = foundRef.current.length;
    onActor({ actor: { id: actor.id, name: actor.name, photo: actor.photo }, found: count, total: actor.films.length, won: why === 'win' });
    setReason(why);
    setPhase('end');
  };

  useEffect(() => {
    if (phase !== 'play') return;
    const timer = setInterval(() => {
      const secs = Math.max(0, (deadline.current - Date.now()) / 1000);
      setLeft(secs);
      if (secs <= 0) endGame('timeout');
    }, 200);
    return () => clearInterval(timer);
  }, [phase, actor]);

  // semua film tertebak sebelum waktu habis = menang
  useEffect(() => {
    if (phase === 'play' && actor && found.length === actor.films.length) endGame('win');
  }, [found]);

  const submit = (e) => {
    e.preventDefault();
    if (phase !== 'play' || clean(input).length < 2) return;
    const hits = matches(input, actor.films);
    const fresh = hits.find((k) => !found.includes(k));
    setInput('');
    if (fresh !== undefined) {
      const film = actor.films[fresh];
      setFound([...found, fresh]);
      return setMsg({ ok: true, text: `${t.hit} ${film.title} (${film.year})` });
    }
    if (hits.length) return setMsg({ ok: false, text: t.already }); // sudah disebut tidak dihukum
    setMsg({ ok: false, text: t.missFilm }); // salah: tidak game over, lanjut menebak
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

  const total = actor.films.length;

  if (phase === 'end') {
    const won = reason === 'win';
    const why = { timeout: t.timeout, wrong: t.reasonWrong, giveup: t.reasonGiveUp }[reason];
    return (
      <Result
        t={t} lang={lang} minimal rapor
        title={t.modes.filmo.name}
        hero={{ photo: actor.photo, name: actor.name }}
        score={found.length * 100}
        correct={found.length} total={total}
        log={actor.films.map((_, k) => found.includes(k))}
        summary={t.filmResult(found.length, total)}
        note={won ? { text: t.allFilms, ok: true } : { text: `${t.gameOver} · ${why}`, ok: false }}
        jab={won ? { text: t.perfectFilmo, ok: true } : found.length >= total / 2
          ? { text: t.praiseFilmo, ok: true }
          : { text: t.jabFilmo(actor.name), ok: false }}
        badges={won ? [actorBadge(actor)] : []}
        onAgain={load} onMenu={onExit}
      />
    );
  }

  return (
    <section className="grid min-h-0 flex-1 content-start gap-4 lg:grid-cols-[1fr_1.2fr] lg:content-center lg:items-center lg:gap-10">
      <div>
        <img src={actor.photo} alt={actor.name} className="mx-auto h-[min(54dvh,440px)] w-auto rounded-md ring-1 ring-white/10" />
        <p className="mt-3 h-9 text-center font-serif text-2xl italic">{actor.name}</p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-serif text-2xl italic leading-tight">{t.modes.filmo.prompt}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-cream/70">{t.guessedN(found.length, total)}</span>
          <span className="text-lg font-semibold tabular-nums">{found.length * 100}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-pink to-volt" style={{ width: `${(left / limit) * 100}%` }} />
        </div>

        <form onSubmit={submit}>
          <input
            autoFocus
            value={input}
            onChange={(e) => { setInput(e.target.value); setMsg(null); }}
            placeholder={t.typeFilm}
            className="min-h-12 w-full rounded-xl border border-white/20 bg-white/5 px-5 outline-none placeholder:text-cream/40 focus:border-pink"
          />
          <p className={`mt-1 h-5 px-2 text-sm ${msg?.ok ? 'text-ok' : 'text-bad'}`}>{msg?.text}</p>
        </form>

        <div className="flex max-h-[28dvh] min-h-24 flex-wrap content-start gap-2 overflow-y-auto">
          {found.map((k) => (
            <span key={actor.films[k].id} className="rounded-lg border border-ok bg-ok/15 px-3 py-1.5 text-sm font-medium">
              {actor.films[k].title} <span className="text-cream/50">{actor.films[k].year}</span>
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
