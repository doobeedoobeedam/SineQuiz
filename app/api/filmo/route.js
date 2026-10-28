import { IMG, shuffle, tmdb } from '../../../lib/tmdb';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (!process.env.TMDB_TOKEN) return Response.json({ error: 'TMDB_TOKEN is empty (.env.local)' }, { status: 500 });
    try {
        // ambil dari 2 halaman "orang populer", pilih yang berprofesi aktor dan punya foto
        const pages = shuffle([1, 2, 3, 4, 5]).slice(0, 2);
        const lists = await Promise.all(pages.map((p) => tmdb(`/person/popular?language=en-US&page=${p}`)));
        const people = shuffle(
            lists.flatMap((r) => r.results).filter((p) => p.known_for_department === 'Acting' && p.profile_path)
        ).slice(0, 8);

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
                        .slice(0, 25) // semua film ini harus ditebak untuk dapat badge, jadi dibatasi
                        .map((m) => ({ id: m.id, title: m.title, original: m.original_title, year: m.release_date.slice(0, 4) }));
                    if (films.length < 10) return null;
                    return { id: p.id, name: p.name, photo: IMG + 'w342' + p.profile_path, films };
                } catch {
                    return null;
                }
            })
        );

        const result = rounds.filter(Boolean).slice(0, 3);
        if (!result.length) return Response.json({ error: 'No actors found' }, { status: 404 });
        return Response.json({ rounds: result });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 502 });
    }
}