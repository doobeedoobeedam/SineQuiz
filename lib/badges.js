//  1. Poster Pixel (MCU, Nolan) didapat kalau SEMUA film dalam set pernah dijawab benar
//  2. "Fans Garis Keras [aktor]" didapat kalau SEMUA film seorang aktor ditebak dalam satu sesi, sebelum waktu habis.
const KEY = 'klaket-stats';

export const SETS = [
  {
    key: 'mcu', icon: '🦸',
    name: { en: 'Multiverse Walker', id: 'Penjelajah Multiverse' },
    desc: { en: 'Guess every MCU film from its pixel poster', id: 'Tebak semua film MCU dari poster pixelnya' },
  },
  {
    key: 'nolan', icon: '🌀',
    name: { en: 'Nolan Devotee', id: 'Pengikut Nolan' },
    desc: { en: 'Guess every Christopher Nolan film from its pixel poster', id: 'Tebak semua film Christopher Nolan dari poster pixelnya' },
  },
];

// data badge satu aktor (dipakai di halaman badge dan layar hasil)
export const actorBadge = (actor) => ({
  key: `actor:${actor.id}`,
  icon: '⭐',
  photo: actor.photo,
  fan: true,
  name: { en: `${actor.name} Hardcore Fan`, id: `Fans Garis Keras ${actor.name}` },
  desc: { en: `Name every ${actor.name} film before time runs out`, id: `Tebak semua film ${actor.name} sebelum waktu habis` },
});

export function loadStats() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
export function saveStats(stats) {
  try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch { }
}

const copy = (s) => ({
  sets: { ...s.sets }, actors: { ...s.actors }, report: { ...s.report }, earned: { ...s.earned }, last: { ...s.last },
});

// stu poster berhasil ditebak (mode MCU / Nolan)
export function recordGuess(stats, { key, filmId, total }) {
  const next = copy(stats);
  const old = next.sets[key] || { ids: [] };
  const ids = old.ids.includes(filmId) ? old.ids : [...old.ids, filmId];
  next.sets[key] = { ids, total };

  let unlocked = [];
  if (ids.length >= total && !next.earned[key]) {
    next.earned[key] = true;
    unlocked = [getBadges(next).find((b) => b.key === key)];
  }
  return { stats: next, unlocked };
}

// satu sesi poster selesai -> simpan nilai (0-100) untuk rapor dan hasil terakhir kategori itu
export function recordRun(stats, key, score, last) {
  const next = copy(stats);
  const old = next.report[key] || { runs: 0, sum: 0 };
  next.report[key] = { runs: old.runs + 1, sum: old.sum + score };
  if (last) next.last[key] = last; // { correct, total }
  return next;
}

// satu sesi Tebak Film Aktor selesai. 'won' = semua film tertebak sebelum waktu habis
export function recordActor(stats, { actor, found, total, won }) {
  const next = copy(stats);
  const id = String(actor.id);
  const old = next.actors[id] || {};
  next.actors[id] = { name: actor.name, photo: actor.photo, total, best: Math.max(old.best || 0, found) };

  const key = `actor:${id}`;
  const rep = next.report[key] || { runs: 0, sum: 0 };
  next.report[key] = { runs: rep.runs + 1, sum: rep.sum + Math.round((100 * found) / total) };

  let unlocked = [];
  if (won && !next.earned[key]) {
    next.earned[key] = true;
    unlocked = [getBadges(next).find((b) => b.key === key)];
  }
  return { stats: next, unlocked };
}

export const average = (r) => (r && r.runs ? Math.round(r.sum / r.runs) : null);

export function letterGrade(p) {
  return p >= 90 ? 'A' : p >= 75 ? 'B' : p >= 60 ? 'C' : 'D';
}

// 0 = penonton biasa ... 3 = superfan
export function fanLevel(got, total) {
  const r = total ? got / total : 0;
  return r >= 1 ? 3 : r >= 0.6 ? 2 : r >= 0.25 ? 1 : 0;
}

// rata-rata semua sesi (untuk kartu rapor di halaman badge)
export function overall(stats) {
  let runs = 0;
  let sum = 0;
  Object.values(stats.report || {}).forEach((r) => { runs += r.runs; sum += r.sum; });
  return { runs, avg: runs ? Math.round(sum / runs) : null };
}

// daftar badge siap tampil. 2 set poster + satu badge per aktor yang pernah dimainkan
export function getBadges(stats) {
  const earned = stats.earned || {};
  const report = stats.report || {};
  const sets = SETS.map((b) => {
    const d = (stats.sets || {})[b.key];
    return { ...b, got: d ? d.ids.length : 0, total: d ? d.total : 0, earned: !!earned[b.key], avg: average(report[b.key]) };
  });
  const actors = Object.entries(stats.actors || {}).map(([id, a]) => ({
    ...actorBadge({ id, name: a.name, photo: a.photo }),
    got: a.best ?? (a.ids ? a.ids.length : 0),
    total: a.total,
    earned: !!earned[`actor:${id}`],
    avg: average(report[`actor:${id}`]),
  }));
  return [...sets, ...actors];
}