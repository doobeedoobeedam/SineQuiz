'use client';
// scene -> gambar blur yang makin jelas
// poster -> poster pixel art yang makin tajam
// link -> foto dua aktor
import { useEffect, useRef, useState } from 'react';
import Frame from './Frame';

function PixelPoster({ src, sharp }) {
  const canvas = useRef(null);
  const [img, setImg] = useState(null);

  useEffect(() => {
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = src;
  }, [src]);

  useEffect(() => {
    if (!img) return;
    const cv = canvas.current;
    const ctx = cv.getContext('2d');
    if (sharp >= 1) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      return;
    }
    const w = Math.round(12 + sharp * 84); // jumlah "pixel" ke samping
    const h = Math.round(w * 1.5);
    const tiny = document.createElement('canvas');
    tiny.width = w;
    tiny.height = h;
    tiny.getContext('2d').drawImage(img, 0, 0, w, h); // kecilkan dulu...
    ctx.imageSmoothingEnabled = false; // ...terus besarkan tanpa dihaluskan = pixel art
    ctx.drawImage(tiny, 0, 0, w, h, 0, 0, cv.width, cv.height);
  }, [img, sharp]);

  return (
    <canvas
      ref={canvas}
      width={300}
      height={450}
      className="mx-auto h-[min(54dvh,440px)] w-auto rounded-md bg-film ring-1 ring-white/10"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

function ActorPair({ actors }) {
  return (
    <div className="flex items-center justify-center gap-4">
      {actors.map((a, k) => (
        <div key={a.name} className="flex items-center gap-4">
          {k === 1 && <span className="font-serif text-4xl italic text-pink">&amp;</span>}
          <figure className="text-center">
            <img src={a.photo} alt={a.name} className="h-[min(40dvh,330px)] w-auto rounded-md ring-1 ring-white/10" />
            <figcaption className="mt-2 font-medium">{a.name}</figcaption>
          </figure>
        </div>
      ))}
    </div>
  );
}

// progress 0 (baru mulai) sampai 1 (waktu habis)
export default function Media({ round, progress, revealed }) {
  if (round.kind === 'poster') return <PixelPoster src={round.image} sharp={revealed ? 1 : progress * 0.5} />;
  if (round.kind === 'link') return <ActorPair actors={round.actors} />;
  const blur = revealed ? 0 : (1 - progress) * 14;
  return (
    <Frame>
      <img
        src={round.image}
        alt=""
        className="h-full w-full object-cover transition-[filter] duration-200 ease-linear"
        style={{ filter: `blur(${blur}px)`, transform: blur ? 'scale(1.1)' : 'scale(1)' }}
      />
    </Frame>
  );
}
