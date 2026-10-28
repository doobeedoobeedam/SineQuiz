import { COUNTRIES } from './countries';

const BASE = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p/';

export const shuffle = (list) => [...list].sort(() => Math.random() - 0.5);
export const tmdbLang = () => 'en-US';

export async function tmdb(path) {
  const res = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}`, accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

// ambil kumpulan film populer dari satu negara / semua negara
export async function getPool(countryCode = 'ALL', lang = 'id') {
  const c = COUNTRIES.find((x) => x.code === countryCode) || COUNTRIES[0];
  const all = c.code === 'ALL';
  const base =
    `/discover/movie?language=${tmdbLang(lang)}&sort_by=vote_count.desc` +
    `&vote_count.gte=${c.minVotes}&include_adult=false` +
    (all ? '' : `&with_origin_country=${c.code}`);

  const first = await tmdb(`${base}&page=1`);
  const maxPage = Math.min(first.total_pages || 1, all ? 25 : 12);
  const pages = shuffle(Array.from({ length: maxPage }, (_, i) => i + 1)).slice(0, 2);
  const results = await Promise.all(pages.map((p) => (p === 1 ? first : tmdb(`${base}&page=${p}`))));

  const seen = new Set();
  const pool = results
    .flatMap((r) => r.results)
    .filter((m) => m.title && m.backdrop_path && !seen.has(m.id) && seen.add(m.id));
  if (pool.length < 4) throw new Error('Not enough films for this country');
  return pool;
}

// bentuk satu soal pilihan ganda
export function makeRound(movie, pool, extra) {
  const decoys = shuffle(pool.filter((x) => x.id !== movie.id && x.title !== movie.title))
    .slice(0, 3)
    .map((x) => x.title);
  return {
    id: movie.id,
    answer: movie.title,
    year: (movie.release_date || '').slice(0, 4),
    genres: movie.genre_ids || [],
    options: shuffle([movie.title, ...decoys]),
    ...extra,
  };
}
