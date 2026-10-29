import { IMG, shuffle, tmdb } from '../../../lib/tmdb';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    if (!process.env.TMDB_TOKEN) return Response.json({ error: 'TMDB_TOKEN is empty (.env.local)' }, { status: 500 });
    const skip = new Set((new URL(req.url).searchParams.get('exclude') || '').split(',').filter(Boolean));

    try {
        const trendPage = 1 + Math.floor(Math.random() * 5);
        const popPage = 1 + Math.floor(Math.random() * 30);
        const [trend, popular] = await Promise.all([
            tmdb(`/trending/person/week?language=en-US&page=${trendPage}`),
            tmdb(`/person/popular?language=en-US&page=${popPage}`),
        ]);

        // gabung, buang yang duplikat, buang yang bukan aktor / tanpa foto / sudah pernah tampil
        const byId = new Map();
        [...trend.results, ...popular.results].forEach((p) => {
            if (p.known_for_department === 'Acting' && p.profile_path && !skip.has(String(p.id))) byId.set(p.id, p);
        });
        const people = shuffle([...byId.values()]).slice(0, 8);

        const rounds = await Promise.all(
            people.map(async (p) => {
                try {
                    const data = await tmdb(`/person/${p.id}/movie_credits?language=en-US`);
                    const seen = new Set();
                    const films = data.cast
                        .filter((m) => m.title && m.release_date && m.vote_count >= 300)
                        .filter((m) => !/self|himself|herself|archive/i.test(m.character || '')) // buang dokumenter/cameo "diri sendiri"
                        .filter((m) => !seen.has(m.id) && seen.add(m.id))
                        .sort((a, b) => b.vote_count - a.vote_count) // film terkenal di urutan atas
                        .slice(0, 25) // semua film ini harus ditebak untuk dapat badge, jadi dibatasin
                        .map((m) => ({ id: m.id, title: m.title, original: m.original_title, year: m.release_date.slice(0, 4) }));
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