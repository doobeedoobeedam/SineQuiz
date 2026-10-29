import { letterGrade } from './badges';
import { SITE } from './site';

const W = 1080;
const H = 1350;
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const CREAM = '#f3ead8';
const PINK = '#ff7ad9';

// ambil nama font yang dipasang next/font lewat CSS variable
async function getFonts() {
  const css = getComputedStyle(document.documentElement);
  const serif = css.getPropertyValue('--f-serif').trim() || 'Georgia, serif';
  const sans = css.getPropertyValue('--f-sans').trim() || 'system-ui, sans-serif';
  try {
    await Promise.all([document.fonts.load(`italic 100px ${serif}`), document.fonts.load(`600 40px ${sans}`)]);
  } catch { }
  return { serif, sans };
}

function glow(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// latar + pita film atas/bawah
function background(ctx) {
  ctx.fillStyle = '#17121f';
  ctx.fillRect(0, 0, W, H);
  glow(ctx, 200, 0, 900, 'rgba(91,108,255,0.38)');
  glow(ctx, W, H, 800, 'rgba(255,122,217,0.22)');
  ctx.fillStyle = '#0b0810';
  ctx.fillRect(0, 0, W, 56);
  ctx.fillRect(0, H - 56, W, 56);
  ctx.fillStyle = CREAM;
  for (let x = 24; x < W; x += 60) {
    ctx.beginPath(); ctx.roundRect(x, 16, 32, 24, 4); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x, H - 40, 32, 24, 4); ctx.fill();
  }
}

function write(ctx, str, x, y, font, color, align = 'left') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

function wrap(ctx, str, x, y, maxW, lineH, font, color, align = 'left', maxLines = 2) {
  ctx.font = font;
  const lines = [];
  let line = '';
  str.split(' ').forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
  });
  lines.push(line);
  lines.slice(0, maxLines).forEach((l, k) => write(ctx, l, x, y + k * lineH, font, color, align));
}

function newCanvas() {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  return cv;
}

// result game
function loadImg(src) {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = `/api/img?u=${encodeURIComponent(src)}`;
  });
}

function para(ctx, text, x, y, maxW, lh, font, color, maxLines = 3, align = 'left') {
  ctx.font = font;
  const lines = [];
  let line = '';
  text.split(' ').forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
  });
  lines.push(line);
  const shown = lines.slice(0, maxLines);
  shown.forEach((l, k) => write(ctx, l, x, y + k * lh, font, color, align));
  return y + shown.length * lh;
}

// result card
const STORY_H = 1920;

// pita film di atas-bawah
function storyBackground(ctx, h) {
  ctx.fillStyle = '#17121f';
  ctx.fillRect(0, 0, W, h);
  const g1 = ctx.createRadialGradient(200, 0, 0, 200, 0, 1100);
  g1.addColorStop(0, 'rgba(91,108,255,0.34)');
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, h);
  const g2 = ctx.createRadialGradient(W, h, 0, W, h, 1000);
  g2.addColorStop(0, 'rgba(255,122,217,0.24)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, h);
  ctx.fillStyle = '#0b0810';
  ctx.fillRect(0, 0, W, 56);
  ctx.fillRect(0, h - 56, W, 56);
  ctx.fillStyle = CREAM;
  for (let x = 24; x < W; x += 60) {
    ctx.beginPath(); ctx.roundRect(x, 16, 32, 24, 4); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x, h - 40, 32, 24, 4); ctx.fill();
  }
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  ctx.fillStyle = 'rgba(243,234,216,0.04)';
  for (let i = 0; i < 1400; i++) ctx.fillRect(rnd() * W, rnd() * h, 2, 2);
  const sweep = ctx.createLinearGradient(0, 0, W, h);
  sweep.addColorStop(0, 'rgba(255,255,255,0.05)');
  sweep.addColorStop(0.5, 'rgba(255,255,255,0)');
  sweep.addColorStop(1, 'rgba(255,255,255,0.03)');
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, W, h);
}

function ornament(ctx, x, y, w = 380) {
  ctx.fillStyle = 'rgba(243,234,216,0.2)';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = PINK;
  ctx.beginPath(); ctx.arc(x + w + 6, y + 1, 6, 0, Math.PI * 2); ctx.fill();
}

// garis tipis + titik pink
function ornamentCenter(ctx, y, half = 170) {
  const c = W / 2;
  ctx.fillStyle = 'rgba(243,234,216,0.2)';
  ctx.fillRect(c - half, y, half - 16, 2);
  ctx.fillRect(c + 16, y, half - 16, 2);
  ctx.fillStyle = PINK;
  ctx.beginPath(); ctx.arc(c, y + 1, 6, 0, Math.PI * 2); ctx.fill();
}

function decorate(ctx, h) {
  // kotak pinggir kiri/kanan dihapus agar bersih dari pita samping
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(rnd() * W, rnd() * h, 2, 2);
  }
  ctx.save();
  ctx.restore();
}

export async function drawResultCard(p) {
  const { t, lang, title, score, correct, total, log, grade, summary, extra, note, jab, hero, minimal, report, badges = [], pct } = p;
  const f = await getFonts();
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = STORY_H;
  const ctx = cv.getContext('2d');
  storyBackground(ctx, STORY_H);
  decorate(ctx, STORY_H);
  const heroImg = await loadImg(hero?.photo);
  const hasHero = !!hero;

  const BLOCK_W = hasHero ? 820 : 900; // lebar blok konten
  const LX = (W - BLOCK_W) / 2; // rata kiri di dalam blok
  const TW = hasHero ? 480 : BLOCK_W; // lebar kolom teks
  const RX = LX + 520; // awal kolom foto
  const HERO_W = 300, HERO_H = 450; // ukuran foto/logo
  const SOFT = 'rgba(243,234,216,0.75)';
  const DIM = 'rgba(243,234,216,0.5)';

  const drawBlock = (c, dy) => {
    const left = (text, y, font, color, maxW = TW, lh = 48, lines = 2) =>
      para(c, text, LX, y, maxW, lh, font, color, lines, 'left');
    const eyebrow = (text, x, y, align = 'left') => {
      c.letterSpacing = '6px';
      write(c, text.toUpperCase(), x, y, `600 22px ${f.sans}`, DIM, align);
      c.letterSpacing = '0px';
    };
    const accent = (x, y, w = 56) => {
      c.fillStyle = PINK;
      c.fillRect(x, y, w, 4);
    };
    const top = 516 + dy;
    let heroEnd = top;

    // kanan: foto / logo kecil + nama
    if (hasHero) {
      if (hero.bg) {
        c.fillStyle = hero.bg;
        c.fillRect(RX, top, HERO_W, HERO_H);
      }
      if (heroImg) {
        const k = Math.min(HERO_W / heroImg.width, HERO_H / heroImg.height);
        const dw = heroImg.width * k;
        const dh = heroImg.height * k;
        c.drawImage(heroImg, RX + (HERO_W - dw) / 2, top + (HERO_H - dh) / 2, dw, dh);
      }
      heroEnd = top + HERO_H + 40;
      para(c, hero.name, RX + HERO_W / 2, heroEnd, HERO_W + 40, 40, `italic 34px ${f.serif}`, CREAM, 2, 'center');
      heroEnd += 90;
    }

    // kiri: skor
    let y = top;
    eyebrow(t.pts, LX + 6, y + 6);
    const base = y + 180;
    write(c, String(score), LX - 8, base, `italic 210px ${f.serif}`, CREAM, 'left');
    accent(LX + 6, base + 26, 72);
    y = base + 110;

    if (!minimal && grade) y = left(grade, y, `italic 58px ${f.serif}`, PINK, TW, 66, 1) + 14;
    if (note) y = left(note.text, y, `600 32px ${f.sans}`, note.ok ? '#3ddc97' : '#ff5d6c', TW, 44, 2) + 10;
    y = left(summary || t.correctOf(correct, total), y, `500 36px ${f.sans}`, SOFT, TW, 46, 2) + 8;
    if (extra) y = left(extra, y + 4, `500 28px ${f.sans}`, DIM, TW, 40, 1) + 8;
    if (!minimal && !report) y = left(t.reportScore(pct, letterGrade(pct)), y + 12, `600 36px ${f.sans}`, PINK, TW, 44, 1) + 8;

    y = Math.max(y, heroEnd) + 48;

    // bar per soal
    if (!minimal && log.length) {
      const gap = 8;
      const w = (BLOCK_W - gap * (log.length - 1)) / log.length;
      log.forEach((ok, k) => {
        const x = LX + k * (w + gap);
        c.fillStyle = ok ? '#3ddc97' : '#ff5d6c';
        c.beginPath(); c.roundRect(x, y, w, 16, 6); c.fill();
      });
      y += 64;
    }

    if (jab) {
      // label RESULT di tengah + garis aksen, lalu kutipan serif besar
      const isPraise = jab.ok;
      c.letterSpacing = '6px';
      write(c, 'RESULT', W / 2 + 3, y + 56, `600 22px ${f.sans}`, isPraise ? PINK : DIM, 'center');
      c.letterSpacing = '0px';
      c.fillStyle = isPraise ? PINK : 'rgba(243,234,216,0.3)';
      c.fillRect(W / 2 - 30, y + 84, 60, 3);
      y = para(c, `\u201C${jab.text}\u201D`, W / 2, y + 156, BLOCK_W - 80, 62, `italic 46px ${f.serif}`, CREAM, 2, 'center') + 72;
    }

    if (badges.length) {
      eyebrow(t.unlocked, LX, y);
      accent(LX, y + 18, 56);
      badges.slice(0, 3).forEach((b, k) => {
        const x = LX + k * 280;
        write(c, b.icon, x, y + 110, `72px ${EMOJI}`, '#fff', 'left');
        para(c, b.name[lang], x, y + 156, 250, 30, `600 24px ${f.sans}`, CREAM, 2, 'left');
      });
      y += 220;
    }
    return y;
  };

  // judul dan logo di atas
  write(ctx, 'SineQuiz', W / 2, 250, `italic 84px ${f.serif}`, CREAM, 'center');
  para(ctx, title, W / 2, 332, 900, 74, `italic 66px ${f.sans}`, CREAM, 1, 'center');
  ornamentCenter(ctx, 384);

  const probe = document.createElement('canvas');
  probe.width = W;
  probe.height = STORY_H;
  const blockH = drawBlock(probe.getContext('2d'), 0) - 500;
  const AREA_TOP = 500, AREA_BOTTOM = 1540;
  const dy = Math.max(0, Math.round(((AREA_BOTTOM - AREA_TOP) - blockH) / 2));
  drawBlock(ctx, dy);

  ornamentCenter(ctx, 1600);
  const urlFont = `600 36px ${f.sans}`;
  const ctaText = `${t.cta} `;
  const urlText = `${SITE.url}`;
  ctx.font = urlFont;
  const w1 = ctx.measureText(ctaText).width;
  const w2 = ctx.measureText(urlText).width;
  const x0 = (W - (w1 + w2)) / 2;
  write(ctx, ctaText, x0, 1680, urlFont, SOFT, 'left');
  write(ctx, urlText, x0 + w1, 1680, urlFont, PINK, 'left');
  return cv;
}

export async function drawBadgesCard({ t, lang, badges, overall }) {
  const f = await getFonts();
  const cv = newCanvas();
  const ctx = cv.getContext('2d');
  background(ctx);

  const done = badges.filter((b) => b.earned).length;
  write(ctx, 'SineQuiz', 80, 190, `italic 84px ${f.serif}`, CREAM);
  write(ctx, t.badgesTitle, 80, 270, `600 40px ${f.sans}`, 'rgba(243,234,216,0.7)');
  write(ctx, `${done}/${badges.length}`, W - 80, 270, `italic 110px ${f.serif}`, PINK, 'right');
  if (overall && overall.avg !== null) {
    write(ctx, `${t.reportAvg}: ${overall.avg} (${letterGrade(overall.avg)})`, 80, 330, `600 34px ${f.sans}`, CREAM);
  }

  // tampilkan maksimal 6 badge (yang udah didapat dulu, lalu yang progresnya terbesar)
  const ratio = (b) => (b.total ? b.got / b.total : 0);
  const shown = [...badges].sort((a, b) => (b.earned - a.earned) || (ratio(b) - ratio(a))).slice(0, 6);
  const size = shown.length <= 2 ? 'big' : shown.length <= 4 ? 'mid' : 'mini';
  const gap = size === 'mini' ? 30 : 40;
  const cw = (W - 160 - gap) / 2;
  const ch = { big: 700, mid: 400, mini: 250 }[size];
  const L = {
    big: { icon: 200, iconY: 290, nameFont: 50, nameY: 400, nameLH: 56, descFont: 26, descY: 500, descLH: 34, barY: ch - 100, labelFont: 30, labelY: ch - 38 },
    mid: { icon: 120, iconY: 150, nameFont: 36, nameY: 218, nameLH: 42, descFont: 21, descY: 282, descLH: 28, barY: ch - 70, labelFont: 24, labelY: ch - 22 },
    mini: { icon: 64, iconY: 92, nameFont: 26, nameY: 140, nameLH: 30, descFont: 0, descY: 0, descLH: 0, barY: ch - 56, labelFont: 22, labelY: ch - 16 },
  }[size];

  shown.forEach((b, k) => {
    const x = 80 + (k % 2) * (cw + gap);
    const y = 380 + Math.floor(k / 2) * (ch + gap);

    ctx.fillStyle = b.earned ? 'rgba(255,122,217,0.14)' : 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = b.earned ? PINK : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 36); ctx.fill(); ctx.stroke();

    ctx.globalAlpha = b.earned ? 1 : 0.25;
    write(ctx, b.icon, x + cw / 2, y + L.iconY, `${L.icon}px ${EMOJI}`, '#fff', 'center');
    ctx.globalAlpha = 1;
    wrap(ctx, b.name[lang], x + cw / 2, y + L.nameY, cw - 60, L.nameLH, `italic ${L.nameFont}px ${f.serif}`, CREAM, 'center');
    if (L.descFont) wrap(ctx, b.desc[lang], x + cw / 2, y + L.descY, cw - 60, L.descLH, `500 ${L.descFont}px ${f.sans}`, 'rgba(243,234,216,0.6)', 'center');

    const frac = b.total ? Math.min(b.got / b.total, 1) : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.roundRect(x + 40, y + L.barY, cw - 80, 16, 8); ctx.fill();
    ctx.fillStyle = PINK;
    ctx.beginPath(); ctx.roundRect(x + 40, y + L.barY, Math.max(16, (cw - 80) * frac), 16, 8); ctx.fill();
    write(ctx, `${b.got}/${b.total || '?'}`, x + cw / 2, y + L.labelY, `600 ${L.labelFont}px ${f.sans}`, 'rgba(243,234,216,0.7)', 'center');
  });

  write(ctx, t.footer, W / 2, 1262, `22px ${f.sans}`, 'rgba(243,234,216,0.4)', 'center');
  return cv;
}