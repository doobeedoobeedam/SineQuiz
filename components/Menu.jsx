'use client';
import { useEffect, useState } from 'react';
import Frame from './Frame';
import { COUNTRIES } from '../lib/countries';
import { SETS } from '../lib/badges';
import { btn } from '../lib/ui';

const PIXEL_COLORS = ['bg-pink', 'bg-volt', 'bg-cream', 'bg-[#8a4bd6]', 'bg-film'];
const PURPLE = 3; // indeks 'bg-[#8a4bd6]' di PIXEL_COLORS

// Hook ->true hanya setelah SEMUA gambar selesai dimuat
function useImagesLoaded(urls) {
  const [ok, setOk] = useState(false);
  const key = urls.join('|');
  useEffect(() => {
    if (!urls.length) { setOk(false); return; }
    let alive = true;
    let done = 0;
    setOk(false);
    urls.forEach((u) => {
      const im = new Image();
      const tick = () => { if (alive && ++done === urls.length) setOk(true); };
      im.onload = tick;
      im.onerror = tick;
      im.src = u;
    });
    return () => { alive = false; };
  }, [key]);
  return ok;
}

const Float = ({ delay = 0, className = '', children }) => (
  <div className={`cover-in ${className}`} style={{ animationDelay: `${delay}s` }}>
    <div className="cover-float" style={{ animationDelay: `${delay}s` }}>{children}</div>
  </div>
);

const SceneArt = () => (
  <div className="focus-in absolute inset-0 grid place-items-center bg-gradient-to-br from-volt via-[#8a4bd6] to-pink">
    <span className="font-serif text-[9rem] italic leading-none text-cream">?</span>
  </div>
);

const PixelArt = () => (
  <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(16, 1fr)', gridTemplateRows: 'repeat(9, 1fr)' }}>
    {Array.from({ length: 144 }, (_, i) => {
      const col = i % 16;
      const row = Math.floor(i / 16);
      return <span key={i} className={PIXEL_COLORS[(col * 3 + row * 5 + ((col * row) % 4)) % 5]} />;
    })}
  </div>
);

const LinkArt = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#ff9f5a]/30 to-film">
    <span className="h-28 w-28 rounded-full bg-pink/90" />
    <span className="-ml-10 h-28 w-28 rounded-full bg-volt/90 mix-blend-screen" />
  </div>
);

const CastArt = () => (
  <div className="absolute inset-0 flex items-center justify-center -space-x-4 bg-gradient-to-br from-ok/25 to-film">
    {['from-pink to-volt', 'from-volt to-ok', 'from-ok to-pink', 'from-pink to-[#ff9f5a]', 'from-[#ff9f5a] to-volt'].map((c) => (
      <span key={c} className={`h-20 w-20 rounded-full bg-gradient-to-br ring-2 ring-ink ${c}`} />
    ))}
  </div>
);

const FilmoArt = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink/25 to-film">
    {['-rotate-12 from-pink to-volt', '-translate-y-2 from-volt to-ok', 'rotate-12 from-ok to-pink'].map((c) => (
      <span key={c} className={`-mx-2 h-32 w-20 rounded-lg bg-gradient-to-b ring-2 ring-ink ${c}`} />
    ))}
  </div>
);

const ActorArt = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-volt/25 to-film">
    {['-rotate-6 from-volt to-pink', '-translate-y-2 from-pink to-ok', 'rotate-6 from-ok to-volt'].map((c) => (
      <span key={c} className={`-mx-3 h-32 w-24 rounded-lg bg-gradient-to-b ring-2 ring-ink ${c}`} />
    ))}
  </div>
);

const VowelArt = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ok/20 to-film px-4">
    <span className="text-center font-serif text-3xl italic leading-tight tracking-wide text-cream sm:text-4xl">
      {'CAN YOU GUESS IT?'.replace(/[AEIOU]/g, '?')}
    </span>
  </div>
);

const PosterMosaic = ({ mosaic }) => {
  let k = 0;
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(16, 1fr)', gridTemplateRows: 'repeat(9, 1fr)' }}>
      {Array.from({ length: 144 }, (_, i) => {
        const col = i % 16;
        const row = Math.floor(i / 16);
        const colorIdx = (col * 3 + row * 5 + ((col * row) % 4)) % 5;
        if (colorIdx === PURPLE) {
          const src = mosaic[k % mosaic.length];
          const delay = (k % 12) * 0.08;
          k++;
          return (
            <span
              key={i}
              className="cover-in relative overflow-hidden"
              style={{ animationDelay: `${delay}s` }}
            >
              <span
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${src})` }}
              />
              <span className="absolute inset-0 bg-ink/10 backdrop-blur-[1px]" />
            </span>
          );
        }
        return <span key={i} className={PIXEL_COLORS[colorIdx]} />;
      })}
    </div>
  );
};

const LinkPhotoArt = ({ photos }) => (
  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-gradient-to-br from-[#ff9f5a]/30 to-film">
    <Float delay={0}>
      <img src={photos[0]} alt="" className="h-28 w-28 rounded-full object-cover ring-2 ring-ink" />
    </Float>
    <span className="font-serif text-4xl italic text-pink">+</span>
    <Float delay={0.4}>
      <img src={photos[1]} alt="" className="h-28 w-28 rounded-full object-cover ring-2 ring-ink" />
    </Float>
  </div>
);

const CastPhotoArt = ({ photos }) => (
  <div className="absolute inset-0 flex items-center justify-center -space-x-4 bg-gradient-to-br from-ok/25 to-film">
    {photos.map((src, k) => (
      <Float key={k} delay={k * 0.25}>
        <img src={src} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-ink" />
      </Float>
    ))}
  </div>
);

const FilmoPhotoArt = ({ photos }) => {
  const tilt = ['-rotate-12', '-translate-y-2', 'rotate-12'];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink/25 to-film">
      {photos.map((src, k) => (
        <Float key={k} delay={k * 0.3} className="-mx-2">
          <img src={src} alt="" className={`h-32 w-20 rounded-lg object-cover ring-2 ring-ink ${tilt[k]}`} />
        </Float>
      ))}
    </div>
  );
};

const ActorPhotoArt = ({ posters }) => {
  const tilt = ['-rotate-6', '-translate-y-2', 'rotate-6'];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-volt/25 to-film">
      {posters.map((src, k) => (
        <Float key={k} delay={k * 0.3} className="-mx-3">
          <img src={src} alt="" className={`h-36 w-24 rounded-lg object-cover ring-2 ring-ink ${tilt[k]}`} />
        </Float>
      ))}
    </div>
  );
};

function Section({ n, flip, art, label, title, desc, play, onPlay, children }) {
  return (
    <article className="grid items-center gap-6 border-t border-white/10 py-16 sm:px-0 lg:grid-cols-2 lg:py-20 lg:gap-14">
      <Frame className={`w-full max-w-[420px] sm:max-w-[480px] lg:max-w-none ${flip ? 'rotate-1 lg:order-2' : '-rotate-1'}`}>
        {art}
      </Frame>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="font-serif text-4xl italic leading-none text-pink sm:text-5xl">{n}</span>
          {label && (
            <span className="inline-flex items-center rounded-full bg-pink px-3 py-1.5 text-xs font-semibold leading-none text-ink">
              {label}
            </span>
          )}
        </div>
        <h2 className="font-serif text-4xl italic leading-[1.05] lg:text-5xl">{title}</h2>
        <p className="max-w-md text-cream/70">{desc}</p>
        {children}
        <div><button onClick={onPlay} className={btn}>{play}</button></div>
      </div>
    </article>
  );
}

function CountrySelect({ t, lang, value, onChange }) {
  return (
    <label className="block max-w-xs text-sm text-cream/60">
      {t.pickCountry}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ colorScheme: 'dark' }}
        className="mt-1.5 min-h-12 w-full rounded-xl border border-white/20 bg-ink px-5 font-medium text-cream outline-none focus:border-pink"
      >
        {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c[lang]}</option>)}
      </select>
    </label>
  );
}

export default function Menu({ t, lang, onStart }) {
  const [country, setCountry] = useState({ scene: 'ALL', link: 'ALL', cast: 'ALL' });
  const [sub, setSub] = useState('mcu');
  const [vowelLevel, setVowelLevel] = useState('easy');
  const [cover, setCover] = useState({ mosaic: [], filmoPhotos: [], linkPhotos: [], castPhotos: [], trio: [] });

  useEffect(() => {
    fetch('/api/posters', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCover((prev) => ({ ...prev, ...d })))
      .catch(() => {});
  }, []);

  const mosaicReady = useImagesLoaded(cover.mosaic);
  const filmoReady = useImagesLoaded(cover.filmoPhotos);
  const linkReady = useImagesLoaded(cover.linkPhotos);
  const castReady = useImagesLoaded(cover.castPhotos);
  const trioReady = useImagesLoaded(cover.trio);

  const picker = (key) => (
    <CountrySelect t={t} lang={lang} value={country[key]} onChange={(v) => setCountry({ ...country, [key]: v })} />
  );
  const play = (mode) => () => onStart({ mode, country: country[mode] });

  return (
    <div className="flex-1">
      <h1 className="py-4 font-serif text-4xl italic leading-none lg:text-5xl -ml-1">{t.heading}</h1>

      <Section n="1" art={<SceneArt />} title={t.modes.scene.name} desc={t.modes.scene.desc} play={t.play} onPlay={play('scene')}>
        <p className="text-sm text-pink">{t.modes.scene.hint}</p>
        {picker('scene')}
      </Section>

      <Section n="2" flip art={mosaicReady ? <PosterMosaic mosaic={cover.mosaic} /> : <PixelArt />} label={t.modes.poster.label} title={t.modes.poster.name} desc={t.modes.poster.desc} play={t.play} onPlay={() => onStart({ mode: sub, country: 'ALL' })}>
        <p className="text-sm text-pink">{t.modes.poster.hint}</p>
        <div className="grid max-w-md gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t.pickPoster}>
          {['mcu', 'nolan'].map((id) => {
            const badge = SETS.find((b) => b.key === id);
            return (
              <button
                key={id}
                role="radio"
                aria-checked={sub === id}
                onClick={() => setSub(id)}
                className={`rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink ${
                  sub === id ? 'border-cream bg-white/10' : 'border-white/20 hover:border-white/50'
                }`}
              >
                <span className="block font-semibold">{t.modes[id].name}</span>
                <span className="block text-sm text-pink">{badge.icon} {badge.name[lang]}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section n="3" art={<VowelArt />} label={t.modes.vowel.label} title={t.modes.vowel.name} desc={t.modes.vowel.desc} play={t.play} onPlay={() => onStart({ mode: 'vowel', country: 'ALL', level: vowelLevel })}>
        <p className="text-sm text-pink">{t.modes.vowel.hint}</p>
        <div className="grid max-w-md gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t.modes.vowel.name}>
          {['easy', 'hard'].map((id) => (
            <button
              key={id}
              role="radio"
              aria-checked={vowelLevel === id}
              onClick={() => setVowelLevel(id)}
              className={`rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink ${
                vowelLevel === id ? 'border-cream bg-white/10' : 'border-white/20 hover:border-white/50'
              }`}
            >
              <span className="block font-semibold">{t.modes.vowel.levels[id]}</span>
              <span className="block text-sm text-cream/60">{t.modes.vowel.levelDesc[id]}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section n="4" flip art={linkReady ? <LinkPhotoArt photos={cover.linkPhotos} /> : <LinkArt />} title={t.modes.link.name} desc={t.modes.link.desc} play={t.play} onPlay={play('link')}>
        <p className="text-sm text-pink">{t.modes.link.hint}</p>
        {picker('link')}
      </Section>

      <Section n="5" art={trioReady ? <ActorPhotoArt posters={cover.trio} /> : <ActorArt />} title={t.modes.actorGuess.name} desc={t.modes.actorGuess.desc} play={t.play} onPlay={() => onStart({ mode: 'actorguess', country: 'ALL' })}>
        <p className="text-sm text-pink">{t.modes.actorGuess.hint}</p>
      </Section>

      <Section n="6" flip art={filmoReady ? <FilmoPhotoArt photos={cover.filmoPhotos} /> : <FilmoArt />} title={t.modes.filmo.name} desc={t.modes.filmo.desc} play={t.play} onPlay={() => onStart({ mode: 'filmo', country: 'ALL' })}>
        <p className="text-sm text-pink">{t.modes.filmo.hint}</p>
      </Section>

      <Section n="7" art={castReady ? <CastPhotoArt photos={cover.castPhotos} /> : <CastArt />} title={t.modes.cast.name} desc={t.modes.cast.desc} play={t.play} onPlay={play('cast')}>
        {picker('cast')}
      </Section>
    </div>
  );
}
