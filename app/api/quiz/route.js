import { IMG, getPool, makeRound, shuffle, tmdb, tmdbLang } from '../../../lib/tmdb';

export const dynamic = 'force-dynamic';

// scene film
async function scene(country, lang) {
  const pool = await getPool(country, lang);
  const rounds = await Promise.all(
    shuffle(pool).slice(0, 16).map(async (m) => {
      try {
        const im = await tmdb(`/movie/${m.id}/images?include_image_language=null`);
        const shots = (im.backdrops || []).filter((b) => !b.iso_639_1 && b.width >= 1000);
        const file = shots.length ? shuffle(shots.slice(0, 10))[0].file_path : country === 'ALL' ? null : m.backdrop_path;
        return file ? makeRound(m, pool, { kind: 'scene', image: IMG + 'w1280' + file }) : null;
      } catch {
        return null;
      }
    })
  );
  return rounds.filter(Boolean).slice(0, 10);
}

function posterRounds(movies, tag) {
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();
  const list = movies.filter(
    (m) => m.poster_path && m.title && m.release_date && m.release_date <= today && !seen.has(m.id) && seen.add(m.id)
  );
  return shuffle(list).map((m) => makeRound(m, list, { kind: 'poster', tag, image: IMG + 'w342' + m.poster_path }));
}

// film MCU -> cari keyword "marvel cinematic universe" di TMDB, lalu ambil SEMUA halamannya
async function mcu(country, lang) {
  const lq = tmdbLang(lang);
  let movies = [];
  try {
    const found = await tmdb('/search/keyword?query=marvel%20cinematic%20universe');
    const ids = found.results.filter((k) => /marvel cinematic universe/i.test(k.name)).map((k) => k.id);
    if (ids.length) {
      const url = (p) => `/discover/movie?with_keywords=${ids.join('|')}&sort_by=primary_release_date.asc&language=${lq}&include_adult=false&page=${p}`;
      const first = await tmdb(url(1));
      const more = await Promise.all(
        Array.from({ length: Math.min(first.total_pages || 1, 10) - 1 }, (_, k) => tmdb(url(k + 2)))
      );
      movies = [first, ...more].flatMap((r) => r.results).filter((m) => m.vote_count >= 300);
    }
  } catch {}

  // cadangan kalau keyword tidak ketemu -> film Marvel Studios (company id 420)
  if (movies.length < 20) {
    const pages = await Promise.all(
      [1, 2, 3].map((p) => tmdb(`/discover/movie?with_companies=420&sort_by=vote_count.desc&vote_count.gte=500&language=${lq}&page=${p}`))
    );
    movies = pages.flatMap((r) => r.results);
  }
  return posterRounds(movies, 'mcu');
}

// semua film yang disutradarai Christopher Nolan (person id 525)
async function nolan(country, lang) {
  const data = await tmdb(`/person/525/movie_credits?language=${tmdbLang(lang)}`);
  return posterRounds(data.crew.filter((m) => m.job === 'Director' && m.vote_count >= 500), 'nolan');
}

// dua aktor utama dari satu film, tebak filmnya
async function link(country, lang) {
  const pool = await getPool(country, lang);
  const rounds = await Promise.all(
    shuffle(pool).slice(0, 16).map(async (m) => {
      try {
        const credits = await tmdb(`/movie/${m.id}/credits?language=${tmdbLang(lang)}`);
        const stars = credits.cast.slice(0, 4).filter((a) => a.profile_path).slice(0, 2);
        if (stars.length < 2) return null;
        const actors = stars.map((a) => ({ name: a.name, photo: IMG + 'w185' + a.profile_path }));
        return makeRound(m, pool, { kind: 'link', actors });
      } catch {
        return null;
      }
    })
  );
  return rounds.filter(Boolean).slice(0, 10);
}

const MODES = { scene, mcu, nolan, link };

// foto/logo khusus untuk layar hasil poster -> logo Marvel Studios atau Christopher Nolan
async function heroFor(mode) {
  if (mode === 'mcu') {
    const c = await tmdb('/company/420');
    return c.logo_path ? IMG + 'original' + c.logo_path : null;
  }
  const p = await tmdb('/person/525');
  return p.profile_path ? IMG + 'w342' + p.profile_path : null;
}

export async function GET(req) {
  if (!process.env.TMDB_TOKEN) return Response.json({ error: 'TMDB_TOKEN is empty (.env.local)' }, { status: 500 });
  const q = new URL(req.url).searchParams;
  const mode = q.get('mode') || 'scene';
  const make = MODES[mode] || scene;
  try {
    const rounds = await make(q.get('country') || 'ALL', q.get('lang') === 'en' ? 'en' : 'id');
    if (!rounds.length) return Response.json({ error: 'No questions found' }, { status: 404 });
    const hero = mode === 'mcu' || mode === 'nolan' ? await heroFor(mode).catch(() => null) : null;
    return Response.json({ rounds, hero });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}