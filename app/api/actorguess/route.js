// Guess the Actor: aktor Hollywood terkenal
// 1. CURATED_ACTORS -> nama acak, dicari di TMDB
// 2. film populer (RECENT_YEARS terakhir) -> pemeran utamanya jadi kandidat, dan film populer itu. dipakai sebagai salah satu dari 3 film, 2 film lainnya dari filmografi aktor
// 3. cadangan -> aktor populer Hollywood
// judul yang mirip (kata pertama sama) tidak ditampilkan
import { IMG, displayTitle, tmdb, titleKey } from '../../../lib/tmdb';
import { CURATED_ACTORS } from '../../../lib/actors';

// Fisher-Yates
function shuffle(list) {
  const a = [...(Array.isArray(list) ? list : [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const dynamic = 'force-dynamic';

const SESSION_PICK = 3; // nama curated per sesi
const POP_FILMS = 50; // film populer yang dipakai sebagai sumber aktor
const POP_FILM_VOTES = 300; // batas minimal vote film populer
const ROUNDS = 10; // total soal per sesi
const RECENT_YEARS = 20;
const MIN_ROUNDS = 3;
const POP_MIN = 10; // cadangan -> skor popularitas minimal
const POPULAR_MAX_PAGE = 60; // cadangan: -> halaman aktor populer yang dipilih acak
const POPULAR_PAGES = 20; // cadangan -> jumlah halaman acak per sesi
const LEAD_MAX_ORDER = 2; // pemeran utama (billing 1-3)
const BATCH = 5;
const POP_PAGE_MAX = 10; // film populer -> halaman TMDB yang dipilih acak dari 1..POP_PAGE_MAX
const POP_PAGE_PICK = 3; // berapa halaman yang diambil per sesi

const isAnimation = (m) => (m.genre_ids || []).includes(16);
const isDoc = (m) => (m.genre_ids || []).includes(99);
const isSelfCameo = (m) => /self|himself|herself|archive/i.test(m.character || '');
const isHollywood = (p) => (p.known_for || []).some((k) => k.media_type === 'movie' && k.original_language === 'en');

// cari satu nama di TMDB -> hasil aktor pertama yang punya foto
async function findActor(name) {
  const r = await tmdb(`/search/person?query=${encodeURIComponent(name)}&language=en-US&include_adult=false`).catch(() => ({ results: [] }));
  return (r.results || []).find((p) => p.known_for_department === 'Acting' && p.profile_path) || null;
}

// sumber 1: nama acak dari CURATED_ACTORS
async function curatedSample() {
  const names = shuffle(CURATED_ACTORS).slice(0, SESSION_PICK);
  const out = [];
  for (let i = 0; i < names.length; i += BATCH) {
    const batch = await Promise.all(names.slice(i, i + BATCH).map(findActor));
    batch.forEach((p) => { if (p) out.push(p); });
  }
  return out;
}

// sumber 2: film populer -> pemeran utamanya. Film populer itu ikut jadi salah satu dari 3 film
async function popularFilmActors(since, today) {
  const pages = shuffle(Array.from({ length: POP_PAGE_MAX }, (_, k) => k + 1)).slice(0, POP_PAGE_PICK);
  const results = await Promise.all(
    pages.map((p) =>
      tmdb(
        `/discover/movie?sort_by=vote_count.desc&vote_count.gte=${POP_FILM_VOTES}` +
        `&primary_release_date.gte=${since}&primary_release_date.lte=${today}&include_adult=false&language=en-US&page=${p}`
      ).catch(() => ({ results: [] }))
    )
  );
  const movies = shuffle(results.flatMap((r) => r.results || []))
    .filter((m) => m.poster_path && m.release_date && !isAnimation(m) && !isDoc(m))
    .slice(0, POP_FILMS);

  const out = [];
  for (let i = 0; i < movies.length; i += BATCH) {
    const batch = movies.slice(i, i + BATCH);
    const credits = await Promise.all(batch.map((m) => tmdb(`/movie/${m.id}/credits?language=en-US`).catch(() => null)));
    batch.forEach((m, k) => {
      const lead = (credits[k]?.cast || []).find((x) => x.profile_path && (x.order ?? 99) <= LEAD_MAX_ORDER);
      if (lead) out.push({ person: { id: lead.id, name: lead.name, profile_path: lead.profile_path }, anchor: m });
    });
  }
  return out;
}

// sumber 3 (cadangan): aktor populer Hollywood, dari halaman yang DIPILIH ACAK
async function popularHollywood() {
  const chosen = shuffle(Array.from({ length: POPULAR_MAX_PAGE }, (_, k) => k + 1)).slice(0, POPULAR_PAGES);
  const pages = await Promise.all(
    chosen.map((p) => tmdb(`/person/popular?language=en-US&page=${p}`).catch(() => ({ results: [] })))
  );
  return pages
    .flatMap((r) => r.results || [])
    .filter((p) => p.known_for_department === 'Acting' && p.profile_path && (p.popularity || 0) >= POP_MIN && isHollywood(p));
}

export async function GET(req) {
  if (!process.env.TMDB_TOKEN) return Response.json({ error: 'TMDB_TOKEN is empty (.env.local)' }, { status: 500 });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - RECENT_YEARS * 365 * 864e5).toISOString().slice(0, 10);

    const [curated, popular, fallbackRaw] = await Promise.all([
      curatedSample(),
      popularFilmActors(since, today),
      popularHollywood(),
    ]);

    // curated, film populer, cadangan (tiap sumber dapat giliran di awal)
    const seen = new Set();
    const actors = [];
    const add = (person, anchor) => {
      if (!person || seen.has(person.id)) return;
      seen.add(person.id);
      actors.push({ person, anchor });
    };
    const lanes = [
      shuffle(curated.map((p) => ({ person: p, anchor: null }))),
      shuffle(popular),
      shuffle(fallbackRaw.map((p) => ({ person: p, anchor: null }))),
    ];
    const maxLen = Math.max(...lanes.map((l) => l.length));
    for (let i = 0; i < maxLen; i++) {
      lanes.forEach((lane) => { if (i < lane.length) add(lane[i].person, lane[i].anchor); });
    }

    const usedFilms = new Set();
    const usedKeys = new Set();
    const rounds = [];
    let tried = 0;

    for (const { person: a, anchor } of actors) {
      if (rounds.length >= ROUNDS) break;
      tried++;
      try {
        const data = await tmdb(`/person/${a.id}/movie_credits?language=en-US`);
        const films = (data.cast || [])
          .filter((m) => m.title && m.release_date && m.poster_path)
          .filter((m) => !isAnimation(m) && !isDoc(m) && !isSelfCameo(m))
          .filter((m) => m.release_date >= since && m.release_date <= today)
          .filter((m) => !usedFilms.has(m.id) && m.id !== anchor?.id)
          .sort((x, y) => (y.vote_count || 0) - (x.vote_count || 0));
        const isLead = (m) => (m.order ?? 99) <= LEAD_MAX_ORDER;

        const picked = [];
        const keysHere = new Set();
        const take = (m) => {
          const key = titleKey(displayTitle(m, 'en'));
          if (!key || keysHere.has(key) || usedKeys.has(key) || picked.includes(m)) return false;
          picked.push(m);
          keysHere.add(key);
          return true;
        };

        // film populer dari sumber 2 dipakai lebih dulu (sudah pasti pemeran utama)
        if (anchor) take(anchor);
        // kalau bukan dari sumber 2, minimal 1 film dengan dia sebagai pemeran utama
        if (!anchor) { for (const m of films.filter(isLead)) { if (take(m)) break; } }
        // lengkapin sampai 3 film dari filmografi
        for (const m of films) { if (picked.length >= 3) break; take(m); }

        if (picked.length < 3) continue;
        if (!anchor && !picked.some(isLead)) continue;

        picked.forEach((m) => { usedFilms.add(m.id); usedKeys.add(titleKey(displayTitle(m, 'en'))); });
        rounds.push({
          id: a.id,
          name: a.name,
          photo: IMG + 'w342' + a.profile_path,
          films: picked.map((m) => ({
            id: m.id,
            title: displayTitle(m, 'en'),
            year: m.release_date.slice(0, 4),
            poster: IMG + 'w342' + m.poster_path,
          })),
        });
      } catch {
        // skip aktor yang gagal diambil
      }
    }

    if (rounds.length < MIN_ROUNDS) {
      return Response.json(
        { error: `Aktor tidak cukup: ${rounds.length} ronde lolos dari ${tried} aktor dicek. Coba lagi` },
        { status: 404 }
      );
    }
    return Response.json({ rounds: shuffle(rounds).slice(0, ROUNDS) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}