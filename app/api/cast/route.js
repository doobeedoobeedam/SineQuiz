// mode Ensemble Cast
import { IMG, getPool, shuffle, tmdb, tmdbLang } from '../../../lib/tmdb';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!process.env.TMDB_TOKEN) return Response.json({ error: 'TMDB_TOKEN is empty (.env.local)' }, { status: 500 });
  const q = new URL(req.url).searchParams;
  const lang = q.get('lang') === 'en' ? 'en' : 'id';
  try {
    const pool = await getPool(q.get('country') || 'ALL', lang, true); // tanpa animasi
    const films = await Promise.all(
      shuffle(pool).slice(0, 9).map(async (m) => {
        try {
          const credits = await tmdb(`/movie/${m.id}/credits?language=${tmdbLang(lang)}`);
          const cast = credits.cast.slice(0, 20).map((a) => ({
            name: a.name,
            photo: a.profile_path ? IMG + 'w185' + a.profile_path : null,
          }));
          if (cast.length < 8 || !m.poster_path) return null;
          return {
            id: m.id,
            title: m.title,
            year: (m.release_date || '').slice(0, 4),
            genres: m.genre_ids || [],
            poster: IMG + 'w342' + m.poster_path,
            cast,
          };
        } catch {
          return null;
        }
      })
    );
    const rounds = films.filter(Boolean).slice(0, 3);
    if (!rounds.length) return Response.json({ error: 'No films found' }, { status: 404 });
    return Response.json({ rounds });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}