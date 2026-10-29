// mode "Tebak Film Aktor"
// utamakan aktor A-list Hollywood / popularitas tinggi / film berbahasa Inggris yang banyak ditonton
import { IMG, shuffle, tmdb } from '../../../lib/tmdb';

export const dynamic = 'force-dynamic';

const POP_MIN = 25; // skor popularitas TMDB minimal untuk A-list

// film bahasa Inggris dengan vote banyak di daftar "known for" aktor
const knownForBlockbuster = (p) =>
    (p.known_for || []).some((k) => k.media_type === 'movie' && k.original_language === 'en' && (k.vote_count || 0) >= 1000);

const isHollywood = (p) => (p.known_for || []).some((k) => k.media_type === 'movie' && k.original_language === 'en');

export async function GET(req) {
    if (!process.env.TMDB_TOKEN) return Response.json({ error: 'TMDB_TOKEN is empty (.env.local)' }, { status: 500 });
    const skip = new Set((new URL(req.url).searchParams.get('exclude') || '').split(',').filter(Boolean));

    try {
        // trending minggu ini + aktor populer dari 10 halaman pertama
        const trendPage = 1 + Math.floor(Math.random() * 3);
        const popPage = 1 + Math.floor(Math.random() * 10);
        const [trend, popular] = await Promise.all([
            tmdb(`/trending/person/week?language=en-US&page=${trendPage}`),
            tmdb(`/person/popular?language=en-US&page=${popPage}`),
        ]);

        // gabung, buang yang duplikat, buang yang bukan aktor / tanpa foto / sudah pernah tampil
        const byId = new Map();
        [...trend.results, ...popular.results].forEach((p) => {
            if (p.known_for_department === 'Acting' && p.profile_path && !skip.has(String(p.id))) byId.set(p.id, p);
        });
        const all = [...byId.values()];

        // prioritas: A-list > Hollywood > semua (kalau kandidat di tingkat itu kurang dari 3)
        const aList = all.filter((p) => (p.popularity || 0) >= POP_MIN && knownForBlockbuster(p));
        const hollywood = all.filter(isHollywood);
        const pool = aList.length >= 3 ? aList : hollywood.length >= 3 ? hollywood : all;

        // urutkan dari yang paling populer, lalu acak di antara 20 teratas
        const people = shuffle(pool.sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 20)).slice(0, 8);

        const rounds = await Promise.all(
            people.map(async (p) => {
                try {
                    const data = await tmdb(`/person/${p.id}/movie_credits?language=en-US`);
                    const seen = new Set();
                    const films = data.cast
                        .filter((m) => m.title && m.release_date) // semua film, termasuk yang terbaru
                        .filter((m) => !/self|himself|herself|archive/i.test(m.character || '')) // buang dokumenter/cameo "diri sendiri"
                        .filter((m) => !seen.has(m.id) && seen.add(m.id))
                        .sort((a, b) => b.vote_count - a.vote_count) // film terkenal di urutan atas
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