// Titles Without Vowels
import { getPool, displayTitle, shuffle } from '../../../lib/tmdb';

export const dynamic = 'force-dynamic';

// skip film yang punya angka/romawi
const onlyLettersAndSpaces = (t) => /^[A-Za-z ]+$/.test(t);
const hasRomanNumeral = (t) =>
  /\b(?=[IVXLCDM]{2,}\b)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})\b/.test(t);

const mask = (title, level) => {
  let s = title.replace(/[aeiou]/gi, '').replace(/\s{2,}/g, ' ').trim();
  if (level === 'hard') s = s.replace(/\s+/g, '');
  return s.toUpperCase();
};

export async function GET(req) {
  if (!process.env.TMDB_TOKEN) return Response.json({ error: 'TMDB_TOKEN is empty (.env.local)' }, { status: 500 });
  const q = new URL(req.url).searchParams;
  const level = q.get('level') === 'hard' ? 'hard' : 'easy';
  const lang = q.get('lang') === 'id' ? 'id' : 'en';
  try {
    const pool = await getPool('ALL', 'en', { noAnimation: true });
    const rounds = shuffle(pool.map((m) => ({ m, t: displayTitle(m, 'en') })).filter(({ t }) => onlyLettersAndSpaces(t) && !hasRomanNumeral(t)))
      .map(({ m, t }) => ({ id: m.id, answer: t, year: (m.release_date || '').slice(0, 4), masked: mask(t, level) }))
      .filter((r) => (r.masked.match(/[A-Z]/g) || []).length >= 3)
      .slice(0, 10);
    if (rounds.length < 4) return Response.json({ error: 'Judul tidak cukup, coba lagi' }, { status: 404 });
    return Response.json({ rounds });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}