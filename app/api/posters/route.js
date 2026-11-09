import { IMG, tmdb } from '../../../lib/tmdb';

export const dynamic = 'force-dynamic';

const FILMO_ACTORS = ['Tom Hanks', 'Meryl Streep', 'Leonardo DiCaprio'];
const LINK_ACTORS = ['Zendaya', 'Robert Pattinson'];
const TRIO_ACTOR = 'Ryan Gosling';
const AVENGERS_ID = 24428; // The Avengers (2012)
const NOLAN_ID = 525;
const MOSAIC_PER_STUDIO = 12; // jumlah poster unique per studio (Marvel & Nolan)

const w342 = (p) => IMG + 'w342' + p;

// foto aktor dari hasil pencarian pertama yang berprofesi aktor dan punya foto
async function personByName(name) {
  const r = await tmdb(`/search/person?query=${encodeURIComponent(name)}&language=en-US`).catch(() => ({ results: [] }));
  return (r.results || []).find((p) => p.known_for_department === 'Acting' && p.profile_path) || null;
}

export async function GET() {
  const out = { mosaic: [], filmoPhotos: [], linkPhotos: [], castPhotos: [], trio: [] };
  if (!process.env.TMDB_TOKEN) return Response.json(out);

  // Pixel Posters -> poster Marvel dan Nolan
  let mcu = [];
  let nolan = [];
  try {
    const r = await tmdb('/discover/movie?with_companies=420|505&sort_by=vote_count.desc&vote_count.gte=1000&language=en-US&page=1');
    mcu = (r.results || []).filter((x) => x.poster_path).slice(0, MOSAIC_PER_STUDIO).map((x) => w342(x.poster_path));
  } catch {}
  try {
    const r = await tmdb(`/person/${NOLAN_ID}/movie_credits?language=en-US`);
    nolan = (r.crew || [])
      .filter((x) => x.job === 'Director' && x.poster_path)
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
      .slice(0, MOSAIC_PER_STUDIO).map((x) => w342(x.poster_path));
  } catch {}
  const mosaic = [];
  for (let i = 0; i < Math.max(mcu.length, nolan.length); i++) {
    if (mcu[i]) mosaic.push(mcu[i]);
    if (nolan[i]) mosaic.push(nolan[i]);
  }
  out.mosaic = mosaic;

  // Name Their Films -> foto 3 aktor
  for (const name of FILMO_ACTORS) {
    const p = await personByName(name);
    if (p) out.filmoPhotos.push(w342(p.profile_path));
  }

  // Connect the Actors -> foto Zendaya + Robert Pattinson
  for (const name of LINK_ACTORS) {
    const p = await personByName(name);
    if (p) out.linkPhotos.push(w342(p.profile_path));
  }

  // Ensemble Cast -> 5 pemeran utama The Avengers (2012)
  try {
    const r = await tmdb(`/movie/${AVENGERS_ID}/credits?language=en-US`);
    out.castPhotos = (r.cast || []).filter((c) => c.profile_path).slice(0, 5).map((c) => w342(c.profile_path));
  } catch {}

  // Guess the Actor -> 3 film rilisan terbaru dari satu aktor
  try {
    const p = await personByName(TRIO_ACTOR);
    if (p) {
      const r = await tmdb(`/person/${p.id}/movie_credits?language=en-US`);
      const today = new Date().toISOString().slice(0, 10);
      const seen = new Set();
      out.trio = (r.cast || [])
        .filter((m) => m.poster_path && m.release_date && m.release_date <= today && (m.order ?? 99) <= 2)
        .sort((x, y) => (y.release_date || '').localeCompare(x.release_date || ''))
        .filter((m) => !seen.has(m.id) && seen.add(m.id))
        .slice(0, 3)
        .map((m) => w342(m.poster_path));
    }
  } catch {}

  return Response.json(out);
}