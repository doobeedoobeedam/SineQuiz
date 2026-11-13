// Soal pilihan ganda
import { IMG, getPool, makeRound, originalTitle, shuffle, tmdb, tmdbLang } from '../../../lib/tmdb';
import { CURATED_ACTORS } from '../../../lib/actors';

export const dynamic = 'force-dynamic';

const MARVEL = '420|505'; // Marvel Studios | Marvel Entertainment
const MARVEL_SHARE = 0.2;  // Guess the Scene -> proporsi film Marvel
const SCENE_ROUNDS = 15;
const LINK_ROUNDS = 15;
const isAnimation = (m) => (m.genre_ids || []).includes(16);

const isGroot = (t) => /groot/i.test(t);
// buang Documentary (99) dan Animation (16), kecuali Groot
const excludedGenre = (m) => (m.genre_ids || []).some((g) => g === 16 || g === 99) && !isGroot(originalTitle(m));

// blask list -> file_path backdrop yang saia tandai sebagai editan penonton. format: '/abc123.jpg'
const BAD_IMAGES = new Set([]);

// whitelist -> film backdrop resmi yang saia pilih sendiri
// formatnya -> id film TMDB -> file_path backdrop. misal: 550 (Fight Club): '/abc123.jpg'
const CURATED = {};

// backdrop yang dipakai -> tanpa teks/bahasa dan tidak ada di blask list.
// backdrop diurutkan dari rating TERENDAH (otomatis paling atas)
function pickShots(backdrops) {
  const clean = backdrops.filter((b) => !b.iso_639_1 && !BAD_IMAGES.has(b.file_path));
  return clean.sort(
    (a, b) => (a.vote_average || 0) - (b.vote_average || 0) || (a.vote_count || 0) - (b.vote_count || 0)
  );
}

// Guess the Scene -> backdrop tanpa teks
async function scene(country, lang) {
  const tl = country === 'ID' ? 'id' : 'en'; // Indonesia = judul asli, lainnya = judul English
  const main = await getPool(country, lang, { noAnimation: true, withoutCompanies: MARVEL, sort: 'vote_count.desc' });
  const marvel = country === 'ALL'
    ? await getPool('ALL', lang, { noAnimation: true, withCompanies: MARVEL }).catch(() => [])
    : [];
  const nMarvel = Math.round(SCENE_ROUNDS * MARVEL_SHARE);
  const picks = shuffle([...shuffle(marvel).slice(0, nMarvel), ...shuffle(main).slice(0, SCENE_ROUNDS + 6)]);

  const rounds = await Promise.all(picks.map(async (m) => {
    try {
      if (CURATED[m.id]) return makeRound(m, main, { kind: 'scene', image: IMG + 'w1280' + CURATED[m.id] }, tl);
      const im = await tmdb(`/movie/${m.id}/images?include_image_language=null`);
      const shots = pickShots(im.backdrops || []);
      const file = shots.length ? shuffle(shots.slice(0, 3))[0].file_path : country === 'ALL' ? null : m.backdrop_path;
      return file ? makeRound(m, main, { kind: 'scene', image: IMG + 'w1280' + file }, tl) : null;
    } catch {
      return null;
    }
  }));
  return shuffle(rounds.filter(Boolean)).slice(0, SCENE_ROUNDS);
}

// Connect the Actors: tiga filter dijalankan bersamaan pada kandidat yang sama, hasilnya digabung.
// F1 -> dua pemeran teratas film (urutan billing)
// F2 -> dua aktor dari daftar FAMOUS_ACTORS
// F3 -> sama kayak F2, dan film itu harus yang paling baru yang dibintangi kedua aktor
// satu film cuma muncul sekali

let famousCache = null;
async function famousIds() {
  if (famousCache) return famousCache;
  const names = Array.isArray(CURATED_ACTORS) ? CURATED_ACTORS : [];
  const found = await Promise.all(
    names.map((name) =>
      tmdb(`/search/person?query=${encodeURIComponent(name)}&language=en-US`)
        .then((r) => (r.results || []).find((p) => p.known_for_department === 'Acting' && p.profile_path) || null)
        .catch(() => null)
    )
  );
  famousCache = new Set(found.filter(Boolean).map((p) => p.id));
  return famousCache;
}

async function link(country, lang) {
  const tl = country === 'ID' ? 'id' : 'en';
  const today = new Date().toISOString().slice(0, 10);
  const famous = await famousIds();

  // kandidat -? rilisan terbaru yang terkenal (minimal 300 vote), 4 halaman teratas
  const [recentPool, popularPool] = await Promise.all([
    getPool(country, lang, {
      noAnimation: true,
      sort: 'primary_release_date.desc',
      minVotes: 200,
      firstPages: true,
      pages: 4,
    }),
    getPool(country, lang, { noAnimation: true, sort: 'vote_count.desc' }),
  ]);
  const pool = [...new Map([...recentPool, ...popularPool].map((m) => [m.id, m])).values()];
  const candidates = [...new Map([
    ...shuffle(recentPool).slice(0, 8),
    ...shuffle(popularPool).slice(0, 8),
  ].map((m) => [m.id, m])).values()];

  // filmografi tiap aktor diambil sekali aja
  const cache = new Map();
  const filmsOf = (id) => {
    if (!cache.has(id)) {
      cache.set(id, tmdb(`/person/${id}/movie_credits?language=en-US`).then((r) => r.cast || []).catch(() => []));
    }
    return cache.get(id);
  };

  // F3 -> film ini adalah yang paling baru yang dibintangi kedua aktor
  const isNewestShared = async (m, [a, b]) => {
    const [castA, castB] = await Promise.all([filmsOf(a.id), filmsOf(b.id)]);
    const bIds = new Set(castB.map((x) => x.id));
    const shared = castA.filter(
      (x) => bIds.has(x.id) && x.release_date && x.release_date <= today && !isAnimation(x)
    );
    if (!shared.length) return false;
    return [...shared].sort((x, y) => y.release_date.localeCompare(x.release_date))[0].id === m.id;
  };

  const results = await Promise.all(
    candidates.map(async (m) => {
      try {
        const credits = await tmdb(`/movie/${m.id}/credits?language=${tmdbLang(lang)}`);
        const cast = Array.isArray(credits?.cast) ? credits.cast : [];
        const found = [];

        // F1 -> dua pemeran teratas yang punya foto
        const s1 = cast.slice(0, 4).filter((a) => a.profile_path).slice(0, 2);
        if (s1.length === 2) found.push({ tier: 1, stars: s1 });

        // F2 & F3 -> dua aktor dari daftar terkenal
        const s2 = cast.slice(0, 8).filter((a) => a.profile_path && famous.has(a.id)).slice(0, 2);
        if (s2.length === 2) {
          found.push({ tier: 2, stars: s2 });
          if (await isNewestShared(m, s2)) found.push({ tier: 3, stars: s2 });
        }

        return found.map((r) => ({
          id: m.id,
          tier: r.tier,
          round: makeRound(
            m,
            pool,
            {
              kind: 'link',
              actors: r.stars.map((a) => ({ name: a.name, photo: IMG + 'w185' + a.profile_path })),
            },
            tl
          ),
        }));
      } catch {
        return [];
      }
    })
  );

  // satu film satu soal, pakai hasil filter paling ketat
  const byFilm = new Map();
  results.flat().forEach((r) => {
    const prev = byFilm.get(r.id);
    if (!prev || r.tier > prev.tier) byFilm.set(r.id, r);
  });
  return shuffle([...byFilm.values()]).map((r) => r.round).slice(0, LINK_ROUNDS);

}

// poster pixel -> semua item dalam satu set
function posterRounds(list, tag, lang) {
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();
  const clean = list.filter((m) => {
    const d = m.release_date || m.first_air_date || '';
    const key = `${m.media || 'movie'}-${m.id}`;
    return d && d <= today && originalTitle(m) && !seen.has(key) && seen.add(key);
  });
  return shuffle(clean).map((m) => makeRound(m, clean, { kind: 'poster', tag, image: IMG + 'w342' + m.poster_path }, lang));
}

// short film dibuang (durasi <40 menit), kecuali "I Am Groot".
const MIN_RUNTIME = 40;
const isGrootShort = (t) => /i am groot/i.test(t);
async function dropShorts(movies) {
  const out = [];
  for (let i = 0; i < movies.length; i += 6) {
    const batch = movies.slice(i, i + 6);
    const details = await Promise.all(
      batch.map((m) => tmdb(`/movie/${m.id}?language=en-US`).catch(() => null))
    );
    batch.forEach((m, k) => {
      const runtime = details[k]?.runtime ?? 0;
      if (isGrootShort(originalTitle(m)) || runtime >= MIN_RUNTIME) out.push(m);
    });
  }
  return out;
}

// MCU -> film + series dari Marvel Studios (420) dan Marvel Entertainment (505)
async function mcu(country, lang) {
  const lq = tmdbLang(lang);
  const movieReqs = [1, 2, 3, 4, 5].map((p) =>
    tmdb(`/discover/movie?with_companies=${MARVEL}&sort_by=vote_count.desc&vote_count.gte=100&include_adult=false&language=${lq}&page=${p}`).catch(() => ({ results: [] }))
  );
  const tvReqs = [1, 2, 3].map((p) =>
    tmdb(`/discover/tv?with_companies=${MARVEL}&sort_by=vote_count.desc&vote_count.gte=50&include_adult=false&language=${lq}&page=${p}`).catch(() => ({ results: [] }))
  );
  const movies0 = (await Promise.all(movieReqs)).flatMap((r) => r.results || [])
    .filter((m) => m.poster_path && !excludedGenre(m))
    .map((m) => ({ ...m, media: 'movie' }));
  const movies = await dropShorts(movies0);
  const tv = (await Promise.all(tvReqs)).flatMap((r) => r.results || [])
    .filter((s) => s.poster_path && !excludedGenre(s))
    .map((s) => ({ ...s, media: 'tv', title: s.name, original_title: s.original_name, release_date: s.first_air_date }));
  return posterRounds([...movies, ...tv], 'mcu', 'en');
}

// Nolan -> film yang dia sutradarai
async function nolan(country, lang) {
  const data = await tmdb(`/person/525/movie_credits?language=${tmdbLang(lang)}`);
  const list = data.crew.filter((m) => m.job === 'Director' && m.poster_path && m.vote_count >= 500 && !excludedGenre(m));
  return posterRounds(list, 'nolan', 'en');
}

// foto untuk layar hasil poster
async function heroFor(mode) {
  if (mode === 'mcu') {
    const c = await tmdb('/company/420');
    return c.logo_path ? IMG + 'original' + c.logo_path : null;
  }
  const p = await tmdb('/person/525');
  return p.profile_path ? IMG + 'w342' + p.profile_path : null;
}

const MODES = { scene, mcu, nolan, link };

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
    console.error('[quiz]', mode, e);
    return Response.json({ error: e.message }, { status: 502 });
  }
}