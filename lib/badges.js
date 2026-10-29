// badge hanya ada selama layar hasil ditampilkan.

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

// badge satu aktor (Tebak Film Aktor)
export const actorBadge = (actor) => ({
  key: `actor:${actor.id}`,
  icon: '⭐',
  photo: actor.photo,
  fan: true,
  name: { en: `${actor.name} Hardcore Fan`, id: `Fans Garis Keras ${actor.name}` },
  desc: { en: `Name every ${actor.name} film before time runs out`, id: `Tebak semua film ${actor.name} sebelum waktu habis` },
});

export function letterGrade(p) {
  return p >= 90 ? 'A' : p >= 75 ? 'B' : p >= 60 ? 'C' : 'D';
}