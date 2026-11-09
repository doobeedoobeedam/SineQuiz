// Ensemble Cast
// - film diambil berdasarkan BAHASA ASLI filmnya
// - semua negara -> hollywood aja (produksi AS / berbahasa Inggris)
// - negara lain -> film dengan bahasa asli negara tsb.
// - Indonesia -> ambil 1 film horor aja, karena kebanyakan horror :D
import { IMG, getPool, isHorror, displayTitle, shuffle, tmdb, tmdbLang } from '../../../lib/tmdb';

export const dynamic = 'force-dynamic';

// kode negara di aplikasi -> kode bahasa asli film di TMDB
const LANG_OF = {
  US: 'en', GB: 'en',
  ID: 'id', KR: 'ko', JP: 'ja', IN: 'hi', FR: 'fr', TH: 'th', CN: 'zh', ES: 'es', IT: 'it', DE: 'de',
};

const CAND_POPULAR = 15;
const CAND_RECENT = 12;

export async function GET(req) {
  if (!process.env.TMDB_TOKEN) return Response.json({ error: 'TMDB_TOKEN is empty (.env.local)' }, { status: 500 });
  const q = new URL(req.url).searchParams;
  const lang = q.get('lang') === 'en' ? 'en' : 'id';
  const country = q.get('country') || 'ALL';
  const tl = country === 'ID' ? 'id' : 'en'; // Indonesia = judul asli, lainnya = judul English
  const isAll = country === 'ALL';
  const isID = country === 'ID';
  const origLang = isAll ? 'en' : LANG_OF[country] || 'en';
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);

  // "Semua negara" -> Hollywood (produksi AS)
  // negara lain -> bahasa asli negara itu
  const countryArg = isAll ? 'US' : 'ALL';

  try {
    const [popular, recent] = await Promise.all([
      getPool(countryArg, lang, { noAnimation: true, originalLanguage: origLang, minVotes: 200 }),
      getPool(countryArg, lang, {
        noAnimation: true,
        originalLanguage: origLang,
        sort: 'primary_release_date.desc',
        minVotes: 10,
        releasedAfter: yearAgo,
        firstPages: true,
      }).catch(() => []),
    ]);

    // kandidat: populer + baru
    const cands = new Map();
    popular.slice(0, CAND_POPULAR).forEach((m) => cands.set(m.id, m));
    recent.slice(0, CAND_RECENT).forEach((m) => cands.set(m.id, m));

    const fetchFilm = async (m) => {
      try {
        const credits = await tmdb(`/movie/${m.id}/credits?language=${tmdbLang(lang)}`);
        const cast = credits.cast.slice(0, 20).map((a) => ({
          name: a.name,
          photo: a.profile_path ? IMG + 'w185' + a.profile_path : null,
        }));
        if (cast.length < 8 || !m.poster_path) return null;
        return {
          id: m.id,
          title: displayTitle(m, tl),
          year: (m.release_date || '').slice(0, 4),
          genres: m.genre_ids || [],
          poster: IMG + 'w342' + m.poster_path,
          cast,
        };
      } catch {
        return null;
      }
    };

    let rounds;
    if (isID) {
      // 1 horor + 2 non-horor
      const horrorPool = await getPool('ALL', lang, {
        originalLanguage: 'id', withGenres: '27', minVotes: 50,
      }).catch(() => []);
      const horrorFilm = horrorPool[0] ? await fetchFilm(horrorPool[0]) : null;

      const normals = shuffle([...cands.values()].filter((m) => !isHorror(m))).slice(0, 8);
      const normalFilms = (await Promise.all(normals.map(fetchFilm))).filter(Boolean);
      const normalPick = shuffle(normalFilms).slice(0, horrorFilm ? 2 : 3);

      rounds = shuffle([...(horrorFilm ? [horrorFilm] : []), ...normalPick]);
    } else {
      const picks = shuffle([...cands.values()]).slice(0, 12);
      const films = (await Promise.all(picks.map(fetchFilm))).filter(Boolean);
      rounds = shuffle(films).slice(0, 3);
    }

    if (!rounds.length) return Response.json({ error: 'Film dengan bahasa ini tidak cukup, coba negara lain' }, { status: 404 });
    return Response.json({ rounds });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}