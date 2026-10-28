const base = 'inline-flex min-h-12 min-w-[10rem] items-center justify-center rounded-full px-8 text-base font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink';

export const btn = `${base} bg-cream text-ink hover:bg-pink`; // tombol utama
export const ghost = `${base} border border-cream/30 hover:border-pink hover:text-pink`; // tombol sekunder
export const accent = `${base} bg-pink text-ink hover:bg-cream`; // tombol share
export const pill = 'inline-flex min-h-10 min-w-[5rem] items-center justify-center rounded-full border px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink'; // tombol kecil di header