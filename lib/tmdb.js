import { COUNTRIES } from './countries';

const BASE = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p/';
const HORROR = 27;

export const shuffle = (list) => [...list].sort(() => Math.random() - 0.5);
export const tmdbLang = () => 'en-US';
export const todayStr = () => new Date().toISOString().slice(0, 10);

export async function tmdb(path) {
  const res = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}`, accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

// kemiripan judul -> kata pertama setelah membuang "the/a/an" dan tanda baca
export const titleKey = (title = '') => {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['the', 'a', 'an'].includes(w));
  return words[0] || '';
};

// judul asli dipakai sebagai jawaban di semua game (misalnya "Ada Apa Dengan Cinta?")
export const originalTitle = (m) => m.original_title || m.original_name || m.title || m.name || '';

// judul yang ditampilkan bahasa Indonesia = judul asli (original), bahasa lain = judul (English)
export const displayTitle = (m, lang = 'en') => {
  const orig = m.original_title || m.original_name || '';
  const title = m.title || m.name || '';
  return lang === 'id' ? (orig || title) : (title || orig);
};

// kumpulan film
// opts:
//   noAnimation     buang Animation (16) dan Documentary (99)
//   withoutGenres   array id genre yang dibuang
//   withGenres      satu id genre yang WAJIB ada (misalnya 27 = horror)
//   withCompanies / withoutCompanies  (pakai "|" untuk banyak id)
//   releasedAfter   tanggal YYYY-MM-DD, film dirilis setelah ini dan sampai hari ini
//   minVotes        batas vote (default mengikuti negara)
//   sort            default vote_count.desc
//   firstPages      true = ambil halaman 1-2 (untuk hasil yang diurutkan tanggal)
//   originalLanguage kode bahasa asli film (misalnya 'id' = bahasa Indonesia)
export async function getPool(countryCode = 'ALL', lang = 'id', opts = {}) {
  const c = COUNTRIES.find((x) => x.code === countryCode) || COUNTRIES[0];
  const all = c.code === 'ALL';
  const {
    noAnimation = false,
    withoutGenres = [],
    withGenres,
    withCompanies,
    withoutCompanies,
    releasedAfter,
    minVotes = c.minVotes,
    sort = 'vote_count.desc',
    firstPages = false,
    originalLanguage,
  } = opts;

  const genres = [...(noAnimation ? [16, 99] : []), ...withoutGenres];
  const base =
    `/discover/movie?language=${tmdbLang(lang)}&sort_by=${sort}&vote_count.gte=${minVotes}&include_adult=false` +
    (all ? '' : `&with_origin_country=${c.code}`) +
    (genres.length ? `&without_genres=${genres.join(',')}` : '') +
    (withGenres ? `&with_genres=${withGenres}` : '') +
    (originalLanguage ? `&with_original_language=${originalLanguage}` : '') +
    (withCompanies ? `&with_companies=${withCompanies}` : '') +
    (withoutCompanies ? `&without_companies=${withoutCompanies}` : '') +
    (releasedAfter ? `&primary_release_date.gte=${releasedAfter}&primary_release_date.lte=${todayStr()}` : '');

  const first = await tmdb(`${base}&page=1`);
  const maxPage = Math.min(first.total_pages || 1, all ? 25 : 12);
  const pageNums = firstPages
    ? [1, 2].filter((p) => p <= maxPage)
    : shuffle(Array.from({ length: maxPage }, (_, i) => i + 1)).slice(0, 2);
  const results = await Promise.all(pageNums.map((p) => (p === 1 ? first : tmdb(`${base}&page=${p}`))));

  const seen = new Set();
  const pool = results
    .flatMap((r) => r.results || [])
    .filter((m) => originalTitle(m) && (m.backdrop_path || m.poster_path))
    .filter((m) => !seen.has(m.id) && seen.add(m.id));
  if (pool.length < 4) throw new Error('Film tidak cukup untuk pilihan ini');
  return pool;
}

export const isHorror = (m) => (m.genre_ids || []).includes(HORROR);

// soal pilihan ganda -> 1 jawaban benar + 3 pengecoh
// pengecoh TIDAK boleh mirip dengan jawaban
export function makeRound(movie, pool, extra, lang = 'en') {
  const answer = displayTitle(movie, lang);
  const seenKeys = new Set([titleKey(answer)]);
  const decoys = [];
  for (const x of shuffle(pool)) {
    if (x.id === movie.id) continue;
    const t = displayTitle(x, lang);
    const k = titleKey(t);
    if (!k || t === answer || seenKeys.has(k)) continue;
    seenKeys.add(k);
    decoys.push(t);
    if (decoys.length === 3) break;
  }
  return {
    id: movie.id,
    answer,
    year: (movie.release_date || movie.first_air_date || '').slice(0, 4),
    options: shuffle([answer, ...decoys]),
    ...extra,
  };
}