// Guess the Actor: aktor Hollywood terkenal.
// - tiap sesi ngambil SESSION_PICK acak dari CURATED_ACTORS
// - nama dicari di TMDB, hasil pertama yang berprofesi aktor dan punya foto yang bisa dipakai
// - cadangan: aktor populer Hollywood, kalau nama dari CURATED_ACTORS belum cukup
// -judul yang mirip (kata pertama sama) tidak ditampilkan
import { IMG, displayTitle, tmdb, titleKey } from '../../../lib/tmdb';
import { CURATED_ACTORS } from '../../../lib/actors';

// Fisher-Yates
function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const dynamic = 'force-dynamic';

const SESSION_PICK = 5; // jumlah nama yang diambil per sesi (acak dari CURATED_ACTORS)
const ROUNDS = 10; // total soal per sesi
const RECENT_YEARS = 8;
const MIN_ROUNDS = 3;
const POP_MIN = 10; // cadangan: skor popularitas minimal
const POPULAR_MAX_PAGE = 60; // cadangan: halaman aktor populer yang dipilih acak
const POPULAR_PAGES = 20; // cadangan: berapa halaman acak yang diambil per sesi (lebih banyak kandidat)
const LEAD_MAX_ORDER = 2; // pemeran utama (billing 1-3)
const BATCH = 5;

const isAnimation = (m) => (m.genre_ids || []).includes(16);
const isDoc = (m) => (m.genre_ids || []).includes(99);
const isSelfCameo = (m) => /self|himself|herself|archive/i.test(m.character || '');
const isHollywood = (p) => (p.known_for || []).some((k) => k.media_type === 'movie' && k.original_language === 'en');

// cari satu nama di TMDB -> hasil aktor pertama yang punya foto
async function findActor(name) {
  const r = await tmdb(`/search/person?query=${encodeURIComponent(name)}&language=en-US&include_adult=false`).catch(() => ({ results: [] }));
  return (r.results || []).find((p) => p.known_for_department === 'Acting' && p.profile_path) || null;
}

// nama acak dari CURATED_ACTORS, dicari satu-satu
async function curatedSample() {
  const names = shuffle(CURATED_ACTORS).slice(0, SESSION_PICK);
  const out = [];
  for (let i = 0; i < names.length; i += BATCH) {
    const batch = await Promise.all(names.slice(i, i + BATCH).map(findActor));
    batch.forEach((p) => { if (p) out.push(p); });
  }
  return out;
}

// cadangan: aktor populer Hollywood, dari halaman yang DIPILIH ACAK
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
  const lang = new URL(req.url).searchParams.get('lang') === 'id' ? 'id' : 'en';
  try {
    const curated = shuffle(await curatedSample());
    const fallback = shuffle(await popularHollywood());
    const seenActor = new Set(curated.map((p) => p.id));
    const actors = [...curated, ...fallback.filter((p) => !seenActor.has(p.id))];

    const today = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - RECENT_YEARS * 365 * 864e5).toISOString().slice(0, 10);
    const usedFilms = new Set();
    const usedKeys = new Set();
    const rounds = [];
    let tried = 0;

    for (const a of actors) {
      if (rounds.length >= ROUNDS) break;
      tried++;
      try {
        const data = await tmdb(`/person/${a.id}/movie_credits?language=en-US`);
        const films = data.cast
          .filter((m) => m.title && m.release_date && m.poster_path)
          .filter((m) => !isAnimation(m) && !isDoc(m) && !isSelfCameo(m))
          .filter((m) => m.release_date >= since && m.release_date <= today)
          .filter((m) => !usedFilms.has(m.id))
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
        // 1) minimal 1 film dengan dia sebagai pemeran utama
        for (const m of films.filter(isLead)) { if (take(m)) break; }
        // 2) sisanya film apa saja (pemeran pendukung boleh)
        for (const m of films) { if (picked.length >= 3) break; take(m); }
        if (picked.length < 3 || !picked.some(isLead)) continue;

        picked.forEach((m) => { usedFilms.add(m.id); usedKeys.add(titleKey(displayTitle(m, 'en'))); });
        rounds.push({
          id: a.id,
          name: a.name,
          photo: IMG + 'w342' + a.profile_path,
          films: picked.map((m) => ({
            id: m.id, title: displayTitle(m, 'en'), year: m.release_date.slice(0, 4), poster: IMG + 'w342' + m.poster_path,
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
    return Response.json({ rounds: shuffle(rounds) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}