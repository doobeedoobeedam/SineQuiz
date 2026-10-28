// "Chris Évans!" -> "chris evans"
export const clean = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();

// "The Matrix" -> "matrix"
export const stripArticle = (s) => s.replace(/^(the|a|an) /, '');

// toleransi salah ketik = sama persis, atau beda satu huruf aja (hanya untuk teks 5 huruf ke atas)
export function near(a, b) {
  if (a === b) return true;
  if (a.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) // satu huruf diganti
    || a.slice(i + 1) === b.slice(i) // satu huruf kelebihan di a
    || a.slice(i) === b.slice(i + 1); // satu huruf kurang di a
}