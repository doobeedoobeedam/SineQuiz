'use client';
import { useState } from 'react';
import ShareModal from './ShareModal';
import { drawResultCard } from '../lib/shareImage';
import { letterGrade } from '../lib/badges';
import { btn, ghost, accent } from '../lib/ui';

export { btn, ghost };

// summary = kalimat utama
// extra = keterangan kecil di bawah summary
// note = { text, ok } keterangan game over / menang
// jab = { text, ok } pujian (ok = true) atau sindiran (ok = false)
// hero = { photo, name } foto/logo kecil di kolom kanan
// minimal = true -> hanya skor
// report = [{ label, value }] kotak report card
export default function Result({ t, lang, title, score, correct, total, log, extra, summary, note, jab, hero, minimal, rapor, report, badges = [], onAgain, onMenu }) {
  const [open, setOpen] = useState(false);
  const ratio = total ? correct / total : 0;
  const pct = Math.round(ratio * 100);
  const grade = t.grades[ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0];
  const line = summary || t.correctOf(correct, total);

  const card = { t, lang, title, score, correct, total, log, grade: minimal ? null : grade, pct, summary: line, extra, note, jab, hero, minimal, rapor, report, badges };

  return (
    <section className="flex min-h-0 flex-1 flex-col justify-center gap-5 py-4 sm:gap-6">
      <p className="text-sm text-cream/60 sm:text-base">{t.credit} &middot; {title}</p>

      <div className="grid grid-cols-2 items-center gap-3 sm:gap-10">
        <div className="flex min-w-0 flex-col gap-2.5 sm:gap-3">
          {note && <p className={`text-sm font-semibold sm:text-lg ${note.ok ? 'text-ok' : 'text-bad'}`}>{note.text}</p>}
          <h2 className="font-serif text-4xl italic leading-none sm:text-7xl lg:text-8xl">{score} {t.pts}</h2>
          {!minimal && <p className="text-base font-semibold sm:text-2xl">{grade}</p>}
          <p className="text-sm text-cream/75 sm:text-base">{line}{extra ? `. ${extra}` : ''}</p>
          {(!minimal || rapor) && !report && <p className="text-sm font-semibold text-pink sm:text-lg">{t.reportScore(pct, letterGrade(pct))}</p>}
          {!minimal && (
            <div className="flex max-w-md gap-1 sm:gap-1.5">
              {log.map((ok, k) => <span key={k} className={`h-2 flex-1 rounded-sm sm:h-3 ${ok ? 'bg-ok' : 'bg-bad'}`} />)}
            </div>
          )}
          {jab && <p className={`text-sm font-medium italic sm:text-base ${jab.ok ? 'text-pink' : 'text-cream/80'}`}>{jab.text}</p>}
          {badges.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-pink sm:text-sm">{t.unlocked}</span>
              {badges.map((b) => (
                <span key={b.key} className="rounded-full border border-pink/60 bg-pink/10 px-2.5 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm">{b.icon} {b.name[lang]}</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-2 sm:gap-3">
          {hero && (
            <>
              <img
                src={hero.photo}
                alt={hero.name}
                style={{ backgroundColor: hero.bg }}
                className={`aspect-[2/3] w-full max-w-[6.5rem] rounded-md object-contain p-1.5 ring-1 ring-white/15 sm:max-w-[12.5rem] sm:p-2`}
              />
              <p className="text-center font-serif text-sm italic leading-tight sm:text-xl">{hero.name}</p>
            </>
          )}
        </div>
      </div>

      {report && (
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="font-serif text-lg italic sm:text-xl">{t.reportCard}</p>
          {report.map((r) => (
            <p key={r.label} className="font-serif text-6xl italic leading-none text-pink sm:text-8xl">{r.value}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button onClick={() => setOpen(true)} className={accent}>{t.share}</button>
        <button onClick={onAgain} className={btn}>{t.again}</button>
        <button onClick={onMenu} className={ghost}>{t.menu}</button>
      </div>

      {open && (
        <ShareModal t={t} build={() => drawResultCard(card)} shareText={`SineQuiz - ${title}: ${score} ${t.pts}`} onClose={() => setOpen(false)} />
      )}
    </section>
  );
}
