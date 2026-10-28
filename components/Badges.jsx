'use client';
import { useState } from 'react';
import { fanLevel, getBadges, letterGrade, overall } from '../lib/badges';
import { drawBadgesCard } from '../lib/shareImage';
import { accent } from '../lib/ui';
import ShareModal from './ShareModal';

export default function Badges({ t, lang, stats }) {
  const [open, setOpen] = useState(false);
  const badges = getBadges(stats);
  const all = overall(stats);
  const done = badges.filter((b) => b.earned).length;
  const buildCard = () => drawBadgesCard({ t, lang, badges, overall: all });

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5 py-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl italic lg:text-5xl">{t.badgesTitle}</h1>
          <p className="mt-1 max-w-xl text-cream/60">{t.badgesDesc}</p>
        </div>
        <button onClick={() => setOpen(true)} className={accent}>{t.share}</button>
      </div>

      <div className="flex items-center gap-5 rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-pink font-serif text-5xl italic text-ink">
          {all.avg === null ? '-' : letterGrade(all.avg)}
        </div>
        <div>
          <p className="font-serif text-2xl italic">{t.reportTitle}</p>
          <p className="text-cream/70">
            {all.avg === null ? t.noRuns : `${t.reportAvg}: ${all.avg} · ${t.reportRuns(all.runs)}`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {badges.map((b) => (
          <div key={b.key} className={`flex items-center gap-5 rounded-3xl border p-5 ${b.earned ? 'border-pink bg-pink/10' : 'border-white/10 bg-white/5'}`}>
            {b.photo
              ? <img src={b.photo} alt="" className={`h-20 w-16 shrink-0 rounded-lg object-cover ${b.earned ? '' : 'opacity-50 grayscale'}`} />
              : <div className={`text-6xl ${b.earned ? '' : 'opacity-30 grayscale'}`}>{b.icon}</div>}
            <div className="min-w-0 flex-1">
              <p className="font-serif text-2xl italic leading-tight">{b.name[lang]}</p>
              <p className="text-sm text-cream/60">{b.desc[lang]}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-pink" style={{ width: `${b.total ? (b.got / b.total) * 100 : 0}%` }} />
              </div>
              <p className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs tabular-nums text-cream/60">
                <span>{b.got}/{b.total || '?'}{b.fan ? ` · ${t.fanLevels[fanLevel(b.got, b.total)]}` : ''}</span>
                <span>{b.avg === null ? '-' : `${t.reportAvg}: ${b.avg} (${letterGrade(b.avg)})`}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {open && <ShareModal t={t} build={buildCard} shareText={`SineQuiz: ${done}/${badges.length} ${t.badges}`} onClose={() => setOpen(false)} />}
    </section>
  );
}
