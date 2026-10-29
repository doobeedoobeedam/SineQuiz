'use client';
import { useEffect, useState } from 'react';
import { accent, ghost } from '../lib/ui';

export default function ShareModal({ t, build, shareText, onClose }) {
  const [src, setSrc] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let url;
    let alive = true;
    Promise.resolve()
      .then(() => build())
      .then((canvas) => new Promise((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob gagal'))), 'image/png')
      ))
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
        setFile(new File([blob], 'sinequiz.png', { type: 'image/png' }));
      })
      .catch((e) => {
        console.error('Gagal membuat kartu:', e);
        if (alive) setError(e?.message || String(e));
      });
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const canShare = file && navigator.canShare?.({ files: [file] });
  const share = () => navigator.share({ files: [file], title: 'SineQuiz', text: shareText }).catch(() => {});

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="flex max-h-full flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        {src ? (
          <img src={src} alt="SineQuiz" className="max-h-[72dvh] w-auto rounded-xl shadow-2xl ring-1 ring-white/15" />
        ) : error ? (
          <p className="max-w-xs rounded-xl bg-bad/15 px-4 py-3 text-center text-sm text-bad">{error}</p>
        ) : (
          <p className="grid h-64 w-52 place-items-center text-cream/70">{t.making}</p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          {src && <a href={src} download="sinequiz.png" className={accent}>{t.download}</a>}
          {canShare && <button onClick={share} className={ghost}>{t.shareNative}</button>}
          <button onClick={onClose} className={ghost}>{t.close}</button>
        </div>
      </div>
    </div>
  );
}