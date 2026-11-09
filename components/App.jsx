'use client';
import { useEffect, useState } from 'react';
import { TEXT } from '../lib/i18n';
import { SETS, actorBadge } from '../lib/badges';
import Menu from './Menu';
import QuizGame from './QuizGame';
import CastGame from './CastGame';
import FilmoGame from './FilmoGame';
import ActorGame from './ActorGame';
import VowelGame from './VowelGame';
import { pill } from '../lib/ui';

const CREDIT = { name: 'Kusuma Wecitra', url: 'https://wecitra.github.io' };

// animasi
const MOTION_CSS = `
@keyframes sq-screen-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes sq-toast-in { from { opacity: 0; transform: translateX(28px) scale(0.96); } to { opacity: 1; transform: none; } }
.sq-screen { animation: sq-screen-in 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.sq-toast { animation: sq-toast-in 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .sq-screen, .sq-toast { animation: none; }
}
`;

export default function App() {
  const [lang, setLang] = useState('en');
  const [screen, setScreen] = useState('menu'); // menu | play
  const [config, setConfig] = useState(null); // { mode, country }
  const [toast, setToast] = useState(null); // notifikasi badge yang baru didapat
  const t = TEXT[lang];

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  // poster MCU / Nolan -> semua film dalam sesi itu benar
  const handleWin = (mode) => {
    const badge = SETS.find((b) => b.key === mode);
    if (badge) setToast(badge);
  };

  // Tebak Film Aktor -> semua film tertebak sebelum waktu habis
  const handleActor = ({ actor, won }) => {
    if (won) setToast(actorBadge(actor));
  };

  const start = (cfg) => { setConfig(cfg); setScreen('play'); };
  const toMenu = () => setScreen('menu');

  // key berubah saat pindah layar, jadi animasi masuk ikut berjalan lagi
  const screenKey = screen === 'menu' ? 'menu' : `play-${config?.mode}`;

  return (
    <main className={`mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-4 lg:px-8 ${screen === 'play' ? 'lg:h-dvh lg:overflow-hidden' : ''}`}>
      <style>{MOTION_CSS}</style>

      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <button onClick={toMenu} className="flex items-baseline gap-3 transition-transform duration-300 hover:-translate-y-0.5">
          <span className="font-serif text-2xl italic tracking-tight sm:text-3xl">SineQuiz</span>
          <span className="hidden text-sm text-cream/50 sm:inline">{t.tagline}</span>
        </button>
        <nav className="flex flex-wrap items-center gap-2">
          {screen !== 'menu' && (
            <button onClick={toMenu} className={`${pill} border-white/20 hover:border-pink hover:-translate-y-0.5`}>{t.menu}</button>
          )}
          <div className="flex overflow-hidden rounded-lg border border-white/20" role="group" aria-label="Language">
            {['en', 'id'].map((l) => (
              <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                className={`min-h-10 min-w-[3.25rem] px-4 text-sm font-semibold uppercase transition-colors duration-200 ${lang === l ? 'bg-cream text-ink' : 'hover:text-pink'}`}>{l}</button>
            ))}
          </div>
        </nav>
      </header>

      <div key={screenKey} className="sq-screen flex min-h-0 flex-1 flex-col">
        {screen === 'menu' && <Menu t={t} lang={lang} onStart={start} />}
        {screen === 'play' && config.mode === 'cast' && (
          <CastGame t={t} lang={lang} country={config.country} onExit={toMenu} />
        )}
        {screen === 'play' && config.mode === 'filmo' && (
          <FilmoGame t={t} lang={lang} onActor={handleActor} onExit={toMenu} />
        )}
        {screen === 'play' && ['scene', 'link', 'mcu', 'nolan'].includes(config.mode) && (
          <QuizGame t={t} lang={lang} mode={config.mode} country={config.country} onWin={handleWin} onExit={toMenu} />
        )}
        {screen === 'play' && config.mode === 'actorguess' && (
          <ActorGame t={t} lang={lang} onExit={toMenu} />
        )}
        {screen === 'play' && config.mode === 'vowel' && (
          <VowelGame t={t} lang={lang} level={config.level} onExit={toMenu} />
        )}
      </div>

      <footer className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-3 text-xs text-cream/40">
        <span>{t.footer}</span>
        <span>
          &copy; 2026{' '}
          <a href={CREDIT.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition hover:text-pink">
            {CREDIT.name}
          </a>
        </span>
      </footer>

      {toast && (
        <div key={toast.key ?? toast.name[lang]} role="status" className="sq-toast fixed bottom-6 right-6 flex items-center gap-3 rounded-2xl border border-pink bg-ink px-5 py-3 shadow-2xl">
          <span className="text-3xl">{toast.icon}</span>
          <span>
            <span className="block text-xs text-pink">{t.unlocked}</span>
            <span className="font-semibold">{toast.name[lang]}</span>
          </span>
        </div>
      )}
    </main>
  );
}