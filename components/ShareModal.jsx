'use client';
import { useEffect, useState } from 'react';
import { accent, ghost } from '../lib/ui';

export default function ShareModal({ t, build, shareText, onClose }) {
  const [src, setSrc] = useState(null);
  const [file, setFile] = useState(null);

  useEffect(() => {
    let url;
    build().then((canvas) =>
      canvas.toBlob((blob) => {
        url = URL.createObjectURL(blob);
        setSrc(url);
        setFile(new File([blob], 'sinequiz.png', { type: 'image/png' }));
      }, 'image/png')
    );
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      if (url) URL.revokeObjectURL(url);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // di HP, tombol "Bagikan" buka menu share bawaan (IG, WA, dll)
  const canShare = file && navigator.canShare?.({ files: [file] });
  const share = () => navigator.share({ files: [file], title: 'SineQuiz', text: shareText }).catch(() => {});

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="flex max-h-full flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        {src ? (
          <img src={src} alt="SineQuiz" className="max-h-[72dvh] w-auto rounded-xl shadow-2xl ring-1 ring-white/15" />
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
