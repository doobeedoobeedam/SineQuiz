// Name Their Films
import { IMG, displayTitle, shuffle, tmdb } from '../../../lib/tmdb';

export const dynamic = 'force-dynamic';

const POP_MIN = 27;
const isHollywood = (p) => (p.known_for || []).some((k) => k.media_type === 'movie' && k.original_language === 'en');
const knownForBlockbuster = (p) =>
  (p.known_for || []).some((k) => k.media_type === 'movie' && k.original_language === 'en' && (k.vote_count || 0) >= 1000);

export async function GET(req) {
  if (!process.env.TMDB_TOKEN) return Response.json({ error: 'TMDB_TOKEN is empty (.env.local)' }, { status: 500 });
  const skip = new Set((new URL(req.url).searchParams.get('exclude') || '').split(',').filter(Boolean));
  const lang = new URL(req.url).searchParams.get('lang') === 'id' ? 'id' : 'en';

  try {
    const trendPage = 1 + Math.floor(Math.random() * 3);
    const popPage = 1 + Math.floor(Math.random() * 10);
    const [trend, popular] = await Promise.all([
      tmdb(`/trending/person/week?language=en-US&page=${trendPage}`),
      tmdb(`/person/popular?language=en-US&page=${popPage}`),
    ]);

    const byId = new Map();
    [...trend.results, ...popular.results].forEach((p) => {
      if (p.known_for_department === 'Acting' && p.profile_path && !skip.has(String(p.id))) byId.set(p.id, p);
    });
    const all = [...byId.values()];

    const aList = all.filter((p) => (p.popularity || 0) >= POP_MIN && knownForBlockbuster(p));
    const hollywood = all.filter(isHollywood);
    const pool = aList.length >= 3 ? aList : hollywood.length >= 3 ? hollywood : all;
    const people = shuffle(pool.sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 20)).slice(0, 8);

    const rounds = await Promise.all(
      people.map(async (p) => {
        try {
          const data = await tmdb(`/person/${p.id}/movie_credits?language=en-US`);
          const seen = new Set();
          const films = data.cast
            .filter((m) => m.title && m.release_date)
            .filter((m) => !/self|himself|herself|archive/i.test(m.character || ''))
            .filter((m) => !seen.has(m.id) && seen.add(m.id))
            .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
            .map((m) => ({
              id: m.id,
              title: displayTitle(m, 'en'),
              original: m.title,
              year: m.release_date.slice(0, 4),
            }));
          if (films.length < 10) return null;
          return { id: p.id, name: p.name, photo: IMG + 'w342' + p.profile_path, films };
        } catch {
          return null;
        }
      })
    );

    const result = shuffle(rounds.filter(Boolean)).slice(0, 3);
    if (!result.length) return Response.json({ error: 'No actors found' }, { status: 404 });
    return Response.json({ rounds: result });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}