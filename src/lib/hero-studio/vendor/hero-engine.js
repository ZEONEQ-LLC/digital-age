/* eslint-disable */
// GENERIERT von scripts/hero-studio/freeze-engine.py aus dem Hero-Studio-Prototyp
// (claude code briefings/hero-studio-uebergabe/quellen, Stand 31.10.2026). Nicht von Hand editieren:
// Aenderungen gehoeren in freeze-engine.py (EDIT-Liste) oder parts/engine-api.js.
//
// Inhalt: gemeinsame Basis (Seed, Canvas-Helfer, Farbklaenge, Layout), Typo-Engine (15 Bewegungen),
// Linien-Engine (10 Animationen, Motive, Symbolsuche) und die Render-Fassade der Shell.
// mulberry32, strHash, recipeFor sind unveraendert: gleiches Rezept = gleiches Bild.
//
// Lizenzen der eingebetteten Daten: src/lib/hero-studio/LICENSES.md
export function createHeroEngine({ icons, iconTags, scriptFont, logoMask }) {
let state = {};
/* ===== shared base (motion/template.html) ===== */
const TAU = Math.PI * 2;
const SEP = '■'; // drawn as a rounded square, the logo's own shape
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- brand constants ---------- */
const FORMATS = {
  square:   { w: 1080, h: 1080, ratio: '1:1',    name: 'Post' },
  portrait: { w: 1080, h: 1350, ratio: '4:5',    name: 'Feed' },
  story:    { w: 1080, h: 1920, ratio: '9:16',   name: 'Story' },
  wide:     { w: 1920, h: 1080, ratio: '16:9',   name: 'Video' },
  og:       { w: 1200, h: 630,  ratio: '1.91:1', name: 'OG / LinkedIn' },
};
// Farbklänge: fixed roles instead of free colours. main = primary text, second = second layer,
// signal = small markers (squares, cursor, highlights), fill = large coloured areas, ink = text on those areas.
// Brand rules: at most two brand colours (green, orange) plus white and grey; green and orange never as text on each
// other's area (both are equally light, 1.7:1, they flicker); grey only for the second layer; dark text on bright fields.
const C_G = '#32ff7e', C_O = '#ff8c42', C_W = '#ffffff', C_GR = '#8a8a8e', C_D = '#1c1c1e';
const SCHEMES = {
  gruen:          { name: 'Grün',            desc: 'Grün auf Dunkel, Weiss als zweite Ebene', main: C_G, second: C_W, signal: C_G, fill: C_G, ink: C_D, bg: null, logo: C_G, hue: 'g' },
  weiss_gruen:    { name: 'Weiss + Grün',    desc: 'Weisser Text, grüne zweite Ebene und Signale', main: C_W, second: C_G, signal: C_G, fill: C_W, ink: C_D, bg: null, logo: C_G, hue: 'w' },
  gruen_orange:   { name: 'Grün + Orange',   desc: 'Grün dominiert, Weiss als zweite Ebene, Orange nur als kleines Signal', main: C_G, second: C_W, signal: C_O, fill: C_G, ink: C_D, bg: null, logo: C_G, hue: 'g' },
  orange:         { name: 'Orange',          desc: 'Orange auf Dunkel, Weiss als zweite Ebene', main: C_O, second: C_W, signal: C_O, fill: C_O, ink: C_D, bg: null, logo: C_O, hue: 'o' },
  orange_gruen:   { name: 'Orange + Grün',   desc: 'Orange dominiert, Grün nur als kleines Signal', main: C_O, second: C_W, signal: C_G, fill: C_O, ink: C_D, bg: null, logo: C_O, hue: 'o' },
  trio:           { name: 'Weiss, Grün, Orange', desc: 'Weisser Text, grüne zweite Ebene, orange Signale', main: C_W, second: C_G, signal: C_O, fill: C_G, ink: C_D, bg: null, logo: C_G, hue: 'w' },
  grau_gruen:     { name: 'Grau + Grün',     desc: 'Weiss und Grau, ein einziges grünes Signal; ruhig und sachlich', main: C_W, second: C_GR, signal: C_G, fill: '#3a3a3e', ink: C_W, bg: null, logo: C_G, hue: 'n' },
  grau_orange:    { name: 'Grau + Orange',   desc: 'Weiss und Grau, ein einziges oranges Signal; ruhig und sachlich', main: C_W, second: C_GR, signal: C_O, fill: '#3a3a3e', ink: C_W, bg: null, logo: C_O, hue: 'n' },
  graufeld:       { name: 'Graufeld',        desc: 'Grüner Text auf grauem Feld, orange Signale', main: C_G, second: C_W, signal: C_O, fill: C_G, ink: C_D, bg: '#2a2a2e', logo: C_G, hue: 'g' },
  flaeche_gruen:  { name: 'Fläche Grün',     desc: 'Ganze Animationsfläche grün, Text dunkel', main: C_D, second: C_D, signal: C_D, fill: C_D, ink: C_G, bg: C_G, logo: C_G, hue: 'G' },
  flaeche_orange: { name: 'Fläche Orange',   desc: 'Ganze Animationsfläche orange, Text dunkel', main: C_D, second: C_D, signal: C_D, fill: C_D, ink: C_O, bg: C_O, logo: C_O, hue: 'O' },
  flaeche_weiss:  { name: 'Fläche Weiss',    desc: 'Ganze Animationsfläche weiss, Text dunkel, orange Signale', main: C_D, second: C_D, signal: C_O, fill: C_D, ink: C_W, bg: C_W, logo: C_G, hue: 'W' },
};
const RUBRIKEN = ['KI & Business', 'Future Tech', 'Swiss AI', 'Tools', 'Podcast', 'Newsletter', 'Spotlight'];
// the rubric no longer fixes the colour; it only tilts the odds towards fitting Farbklänge
const RUBRIK_PREF = {
  'KI & Business': ['gruen', 'weiss_gruen', 'gruen_orange', 'flaeche_gruen', 'graufeld'],
  'Newsletter': ['gruen', 'weiss_gruen', 'gruen_orange', 'flaeche_gruen', 'graufeld'],
  'Spotlight': ['gruen', 'trio', 'flaeche_weiss', 'flaeche_gruen'],
  'Tools': ['orange', 'orange_gruen', 'flaeche_orange', 'grau_orange'],
  'Podcast': ['orange', 'orange_gruen', 'flaeche_orange', 'grau_orange'],
  'Future Tech': ['trio', 'grau_gruen', 'grau_orange', 'flaeche_weiss', 'graufeld'],
  'Swiss AI': ['trio', 'grau_gruen', 'grau_orange', 'flaeche_weiss', 'gruen_orange'],
};
function pickScheme(rnd) {
  const pref = RUBRIK_PREF[state.rubrik] || [];
  const pool = Object.keys(SCHEMES).flatMap(id => pref.includes(id) ? [id, id, id] : [id]);
  return pool[Math.floor(rnd() * pool.length)];
}

/* ---------- seeded randomness ---------- */
function strHash(s) { let h = 2166136261 >>> 0; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function slugify(s) {
  return (s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
function articleKeyFrom(slugInput, headline) {
  let s = (slugInput || '').trim();
  if (s) {
    s = s.split(/[?#]/)[0];
    const parts = s.split('/').filter(Boolean);
    s = parts.length ? parts[parts.length - 1] : s;
  }
  return slugify(s) || slugify(headline) || 'artikel';
}
const articleKey = () => articleKeyFrom(state.slug, state.headline);
const codeFor = (key) => '#' + (strHash(key) & 0xffff).toString(16).toUpperCase().padStart(4, '0');

/* ---------- canvas + text helpers ---------- */
let cv = document.createElement('canvas');
let ctx = cv.getContext('2d');
const hasLS = 'letterSpacing' in ctx;
const hasRR = typeof ctx.roundRect === 'function';
let BASE = new DOMMatrix();

function fontStr(weight, px, fam) { return `${weight} ${px.toFixed(2)}px ${fam === 'mono' ? '"DA Mono"' : '"DA Grotesk"'}`; }
function setLS(c, px) { if (hasLS) c.letterSpacing = px ? px.toFixed(2) + 'px' : '0px'; }
function rr(c, x, y, w, h, r) { if (hasRR) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
function xf(a, b, c, d, e, f) { ctx.setTransform(BASE); ctx.transform(a, b, c, d, e, f); }
function resetXf() { ctx.setTransform(BASE); }
function hash(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
function rgb(hex) { const h = hex.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
function mix(a, b, t) { return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`; }
function alpha(hex, a) { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; }

const capCache = new Map();
function capAscent(font) {
  let v = capCache.get(font);
  if (v === undefined) { ctx.font = font; setLS(ctx, 0); v = ctx.measureText('H').actualBoundingBoxAscent; capCache.set(font, v); }
  return v;
}
function wrap(c, text, maxW, font) {
  c.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (!cur || c.measureText(test).width <= maxW) cur = test;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
const fitCache = new Map();
function fit(c, text, maxW, maxH, startPx, weight, fam, lh, maxLines = 99, track = 0) {
  const key = [c === ctx ? 'm' : 'o', text, maxW | 0, maxH | 0, startPx | 0, weight, fam, lh, maxLines, track].join('|');
  const hit = fitCache.get(key);
  if (hit) return hit;
  const ok = (px) => {
    const font = fontStr(weight, px, fam);
    setLS(c, px * track);
    const lines = wrap(c, text, maxW, font);
    let widest = 0;
    for (const l of lines) widest = Math.max(widest, c.measureText(l).width);
    return (lines.length <= maxLines && widest <= maxW && lines.length * px * lh <= maxH) ? lines : null;
  };
  let res = null;
  const direct = ok(startPx);
  if (direct) res = { px: startPx, lines: direct };
  else {
    let lo = 4, hi = startPx;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      const l = ok(mid);
      if (l) { res = { px: mid, lines: l }; lo = mid; } else hi = mid;
    }
    if (!res) res = { px: lo, lines: wrap(c, text, maxW, fontStr(weight, lo, fam)) };
  }
  setLS(c, 0);
  if (fitCache.size > 500) fitCache.clear();
  fitCache.set(key, res);
  return res;
}
function kineticText(e) {
  const s = (state.text || '').replace(/\s+/g, ' ').trim() || 'digital age';
  return e.upper ? s.toLocaleUpperCase('de-CH') : s;
}
const schemeCache = new Map();
function schemePalettes(id) {
  let sp = schemeCache.get(id);
  if (sp) return sp;
  const c = SCHEMES[id] || SCHEMES.gruen;
  const bright = !!c.bg && c.bg !== '#2a2a2e';
  const win = {
    bg: c.bg || C_D, accent: c.main, fg: c.second, signal: c.signal, fill: c.fill, ink: c.ink,
    muted: bright ? alpha(C_D, 0.7) : '#b0b0b0',
    dim: bright ? alpha(C_D, 0.14) : alpha(c.main, 0.15),
    band: bright ? alpha(C_D, 0.1) : (c.bg ? '#34343a' : '#2a2a2e'),
    line: bright ? alpha(C_D, 0.25) : '#3a3a3e',
  };
  const frame = { bg: C_D, fg: C_W, accent: c.logo, logo: c.logo, muted: '#b0b0b0', dim: alpha(c.logo, 0.15), line: '#3a3a3e' };
  sp = { win, frame, filled: !!c.bg };
  schemeCache.set(id, sp);
  return sp;
}

/* ---------- signature: a 5×5 mirrored mark of rounded squares, unique per article ---------- */
const sigCache = new Map();
function sigBits(key) {
  let g = sigCache.get(key);
  if (g) return g;
  const r = mulberry32(strHash('sig|' + key));
  for (let attempt = 0; attempt < 40; attempt++) {
    g = []; let on = 0, mid = 0;
    for (let y = 0; y < 5; y++) {
      const a = r() < 0.5, b = r() < 0.5, c = r() < 0.55;
      g.push([a, b, c, b, a]);
      on += (a ? 2 : 0) + (b ? 2 : 0) + (c ? 1 : 0); mid += c ? 1 : 0;
    }
    if (on >= 9 && on <= 19 && mid >= 2) break;
  }
  sigCache.set(key, g);
  return g;
}
function drawSig(c, bits, x, y, size, on, off, sFactor = 0.8) {
  const cell = size / 5, s = cell * sFactor, r = s * 0.28, o = (cell - s) / 2;
  if (off) {
    c.fillStyle = off; c.beginPath();
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (!bits[j][i]) rr(c, x + i * cell + o, y + j * cell + o, s, s, r);
    c.fill();
  }
  c.fillStyle = on; c.beginPath();
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (bits[j][i]) rr(c, x + i * cell + o, y + j * cell + o, s, s, r);
  c.fill();
}

/* ---------- logo ---------- */
const logoImg = new Image();
const logoReady = new Promise((res) => { logoImg.onload = res; logoImg.onerror = res; });
logoImg.src = logoMask;
const tintCache = new Map();
function tintedLogo(color) {
  if (!logoImg.naturalWidth) return null;
  let c = tintCache.get(color);
  if (!c) {
    c = document.createElement('canvas');
    c.width = logoImg.naturalWidth; c.height = logoImg.naturalHeight;
    const o = c.getContext('2d');
    o.drawImage(logoImg, 0, 0);
    o.globalCompositeOperation = 'source-in';
    o.fillStyle = color; o.fillRect(0, 0, c.width, c.height);
    tintCache.set(color, c);
  }
  return c;
}

/* ---------- layout: brand bar, animation window, headline block ---------- */
// Headline that would need to shrink below 72 % of its design size is cut with an ellipsis instead.
function headlineFit(text, maxW, hp0, maxLines) {
  const f = fit(ctx, text, maxW, hp0 * 1.12 * maxLines, hp0, 700, 'grotesk', 1.12, maxLines);
  const minPx = hp0 * 0.72;
  if (f.px >= minPx) return f;
  const font = fontStr(700, minPx, 'grotesk');
  const all = wrap(ctx, text, maxW, font);
  const lines = all.slice(0, maxLines);
  if (all.length > maxLines) {
    ctx.font = font;
    let last = lines[maxLines - 1];
    while (last.includes(' ') && ctx.measureText(last + ' …').width > maxW) last = last.slice(0, last.lastIndexOf(' '));
    lines[maxLines - 1] = last.replace(/[\s,.;:–-]+$/, '') + ' …';
  }
  return { px: minPx, lines, truncated: all.length > maxLines };
}
function computeLayout(W, H) {
  const u = Math.min(W, H);
  const wide = W / H > 1.3;
  const story = H / W > 1.6;
  const m = Math.round(u * (wide ? 0.075 : 0.06));
  // 9:16 keeps logo and headline out of the zones that Instagram/Facebook cover with their interface (top ~14 %, bottom ~18 %)
  const topPad = story ? Math.round(H * 0.14) : m;
  const botPad = story ? Math.round(H * 0.18) : m;
  const L = { W, H, u, m, wide, story, topY: topPad, bottomY: H - botPad };
  let top = 0, bottom = H;
  if (state.showBrand) {
    L.brandH = Math.round(u * (wide ? 0.1 : 0.072));
    top = topPad + L.brandH + Math.round(m * 0.5);
  }
  if (state.showHeadline) {
    const hl = (state.headline || '').replace(/\s+/g, ' ').trim();
    const useCol = wide && !!hl;   // wide formats: headline column left, animation right
    const maxW = useCol ? W * 0.42 - m * 1.8 : W - m * 2;
    const maxLines = useCol ? 4 : 3;
    const hp0 = u * (wide ? 0.068 : 0.058);
    L.hl = hl ? headlineFit(hl, maxW, hp0, maxLines) : { px: hp0, lines: [] };
    L.hlW = maxW;
    L.metaPx = Math.round(u * (wide ? 0.028 : 0.023));
    const n = L.hl.lines.length;
    const blockH = n ? n * L.hl.px * 1.12 + L.metaPx * 1.9 : L.metaPx * 1.1;
    L.hlTop = L.bottomY - blockH;
    if (useCol) {
      const x = Math.round(W * 0.42);
      L.rect = { x, y: top, w: W - x, h: Math.max(60, L.bottomY - L.metaPx * 1.8 - top) };
      return L;
    }
    bottom = L.hlTop - Math.round(m * 0.75);
  }
  L.rect = { x: 0, y: top, w: W, h: Math.max(60, bottom - top) };
  return L;
}


function drawHeadline(L, pal) {
  const { m, W, H, u } = L;
  const f = L.hl;
  ctx.fillStyle = pal.line;
  ctx.fillRect(m, Math.round(L.hlTop - m * 0.4), L.hlW, Math.max(1, Math.round(u * 0.0018)));
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (f.lines.length) {
    const font = fontStr(700, f.px, 'grotesk');
    ctx.font = font; ctx.fillStyle = pal.fg;
    let y = L.hlTop + capAscent(font) + f.px * 0.04;
    for (const line of f.lines) { ctx.fillText(line, m, y); y += f.px * 1.12; }
  }
  const mf = fontStr(500, L.metaPx, 'mono');
  ctx.font = mf; setLS(ctx, L.metaPx * 0.08);
  const meta = [state.author, state.date].map(s => (s || '').trim()).filter(Boolean).join('  ·  ').toLocaleUpperCase('de-CH');
  ctx.fillStyle = pal.muted;
  if (meta) ctx.fillText(meta, m, L.bottomY);
  ctx.textAlign = 'right'; ctx.fillStyle = pal.accent;
  ctx.fillText('digital-age.ch', W - m, L.bottomY);
  setLS(ctx, 0);
  ctx.textAlign = 'left';
}

/* ---------- background layers (straight, behind the motion) ---------- */
function drawTexture(R, p, pal, e, L, key) {
  const u = L.u;
  if (e.texture === 'dots') {
    const g = u * 0.036, s = g * 0.17;
    ctx.fillStyle = pal.dim; ctx.beginPath();
    for (let y = R.y + g / 2; y < R.y + R.h; y += g) for (let x = R.x + g / 2; x < R.x + R.w; x += g) rr(ctx, x - s / 2, y - s / 2, s, s, s * 0.28);
    ctx.fill();
  } else if (e.texture === 'lines') {
    const g = u * 0.05, off = p * g;
    ctx.fillStyle = pal.dim;
    const lw = Math.max(1, u * 0.0016);
    for (let y = R.y - g + off; y < R.y + R.h; y += g) ctx.fillRect(R.x, Math.round(y), R.w, lw);
  } else if (e.texture === 'scan') {
    const g = Math.max(3, u * 0.006);
    ctx.fillStyle = pal.dim; ctx.globalAlpha = 0.35;
    for (let y = R.y; y < R.y + R.h; y += g) ctx.fillRect(R.x, y, R.w, 1);
    ctx.globalAlpha = 1;
    const band = R.h * 0.28;
    const y = R.y - band + p * (R.h + band);
    const gr = ctx.createLinearGradient(0, y, 0, y + band);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.85, pal.dim); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(R.x, y, R.w, band);
  } else if (e.texture === 'signature') {
    const size = Math.max(R.w, R.h) * 1.3 * (1 + 0.02 * Math.sin(TAU * p));
    ctx.globalAlpha = 0.7;
    drawSig(ctx, sigBits(key), R.x + R.w - size * 0.58, R.y + R.h - size * 0.6, size, pal.dim, null, 0.86);
    ctx.globalAlpha = 1;
  }
}
function drawFigure(R, p, pal, e, L) {
  const fig = (state.figure || '').trim();
  if (!fig) return;
  const f = fit(ctx, fig, R.w * 0.86, R.h * 0.62, R.h * 0.62, 700, 'grotesk', 1, 1);
  const font = fontStr(700, f.px, 'grotesk');
  ctx.font = font;
  const capA = capAscent(font);
  const side = e.align === 'right' ? 'left' : 'right';
  ctx.textAlign = side; ctx.textBaseline = 'alphabetic';
  const drift = Math.sin(TAU * p) * R.w * 0.015;
  const x = side === 'right' ? R.x + R.w - L.m * 0.6 + drift : R.x + L.m * 0.6 + drift;
  ctx.strokeStyle = pal.accent; ctx.globalAlpha = 0.24;
  ctx.lineWidth = Math.max(1.5, f.px * 0.012); ctx.lineJoin = 'round';
  ctx.strokeText(fig, x, R.y + R.h - L.m * 0.4);
  ctx.globalAlpha = 1;
  void capA;
}

const ALT_COLOR = {
  de: { gruen: 'in Grün auf dunklem Grund', weiss_gruen: 'in Weiss mit grünen Akzenten auf dunklem Grund', gruen_orange: 'in Grün mit orangen Akzenten auf dunklem Grund', orange: 'in Orange auf dunklem Grund', orange_gruen: 'in Orange mit grünen Akzenten auf dunklem Grund', trio: 'in Weiss, Grün und Orange auf dunklem Grund', grau_gruen: 'in Weiss und Grau mit grünen Akzenten auf dunklem Grund', grau_orange: 'in Weiss und Grau mit orangen Akzenten auf dunklem Grund', graufeld: 'in Grün auf einem grauen Feld', flaeche_gruen: 'dunkel auf grüner Fläche', flaeche_orange: 'dunkel auf oranger Fläche', flaeche_weiss: 'dunkel auf weisser Fläche' },
  en: { gruen: 'in green on a dark background', weiss_gruen: 'in white with green accents on a dark background', gruen_orange: 'in green with orange accents on a dark background', orange: 'in orange on a dark background', orange_gruen: 'in orange with green accents on a dark background', trio: 'in white, green and orange on a dark background', grau_gruen: 'in white and grey with green accents on a dark background', grau_orange: 'in white and grey with orange accents on a dark background', graufeld: 'in green on a grey panel', flaeche_gruen: 'in dark type on a green field', flaeche_orange: 'in dark type on an orange field', flaeche_weiss: 'in dark type on a white field' },
};
function detectLang(text) {
  return /[äöüÄÖÜ]|\b(der|die|das|und|mit|für|ist|nicht|wie|ein|eine|auf|zu|im|den|von)\b/i.test(text || '') ? 'de' : 'en';
}

/* ===== typo engine (motion/template.html + hero/typo-api.js) ===== */
const TYPO = (function () {
const MODES = {
  cylinder:  { name: 'Zylinder',  draw: drawCylinder,  base: 8,   angles: [0, 0, -6, 6, 90], align: false, desc: 'Text läuft in Reihen um eine rotierende Walze', fits: 'Systeme, Kreisläufe, Plattformen, Infrastruktur', subs: ['gleichlaufend', 'gegenläufig', 'verdreht'] },
  ticker:    { name: 'Laufband',  draw: drawTicker,    base: 6,   angles: [-14, -9, -5, 5, 9, 14], align: false, fill: true, desc: 'Schräge Bänder laufen wie ein Live-Ticker', fits: 'News, Tempo, Dringlichkeit, Märkte', subs: ['gegenläufig', 'gleichlaufend', 'zwei Tempi'] },
  decode:    { name: 'Decode',    draw: drawDecode,    base: 6,   angles: [0, 0, 0, -5, 5], align: true, desc: 'Zeichen entschlüsseln sich zum Text', fits: 'Daten, Sicherheit, Code, Enthüllung, Analyse', subs: ['von links', 'zufällig', 'aus der Mitte'] },
  raster:    { name: 'Raster',    draw: drawRaster,    base: 4,   angles: [0, 0, -8, 8], align: true, fill: true, desc: 'Text als Pixelfeld aus Logo-Quadraten mit Lichtwelle', fits: 'Digitalisierung, Hardware, Screens, Chips', subs: ['diagonal', 'radial', 'vertikal'] },
  echo:      { name: 'Echo',      draw: drawEcho,      base: 6,   angles: [0, 0, -6, 6], align: true, desc: 'Schwingende 3D-Tiefe hinter dem Text', fits: 'Wirkung, Tragweite, grosse Thesen, Nachhall', subs: ['Kreisbahn', 'horizontal', 'vertikal'] },
  wave:      { name: 'Welle',     draw: drawWave,      base: 4,   angles: [0, 0, -4, 4], align: true, desc: 'Das Schriftgewicht wogt durch die Zeile', fits: 'Wandel, Rhythmus, Menschen, organisches Wachstum', subs: ['laufend', 'aus der Mitte', 'zeilenweise'] },
  takt:      { name: 'Takt',      draw: drawTakt,      base: 4.8, angles: [0, 0, 0, -5, 5], align: true, fill: true, desc: 'Wort für Wort im Beat, formatfüllend', fits: 'Statements, Thesen, Aufzählungen, Meinungen', subs: ['Folge A', 'Folge B', 'Folge C'] },
  fallblatt: { name: 'Fallblatt', draw: drawFallblatt, base: 7,   angles: [0, 0, 0, -4, 4], align: true, desc: 'Buchstaben klappen ein wie an der SBB-Anzeige', fits: 'Schweiz, Ankündigungen, Termine, Zeitpläne, Mobilität', subs: ['von links', 'zufällig', 'aus der Mitte'] },
  ring:      { name: 'Ring',      draw: drawRing,      base: 10,  angles: [0], align: false, desc: 'Text kreist auf gegenläufigen Ringen', fits: 'Ökosysteme, Zyklen, Vernetzung, Kreislaufwirtschaft', subs: ['2 Ringe', '3 Ringe', '4 Ringe'] },
  pfad:      { name: 'Schlaufe',  draw: drawPfad,      base: 12,   angles: [0, 0, -8, 8], align: false, desc: 'Text fliesst auf einer Endlosbahn', fits: 'Prozesse, Workflows, Automatisierung, Lieferketten', subs: ['Achterschlaufe', 'Rennbahn', 'Welle'] },
  streuung:  { name: 'Streuung',  draw: drawStreuung,  base: 6,   angles: [0, 0, -5, 5], align: true, desc: 'Buchstaben sammeln sich aus dem Chaos und zerfallen wieder', fits: 'Disruption, Ordnung aus Chaos, Fragmentierung, Umbruch', subs: ['Zufall', 'Explosion', 'Fall'] },
  stapel:    { name: 'Stapel',    draw: drawStapel,    base: 6,   angles: [0, 0, 0, -6, 6], align: true, desc: 'Wörter rasten ein wie eine Walze', fits: 'Auswahl, Rankings, Optionen, Vergleiche, Stufen', subs: ['nach oben', 'nach unten', 'Trommel'] },
  schnitt:   { name: 'Schnitt',   draw: drawSchnitt,   base: 4,   angles: [0, 0, -5, 5], align: true, desc: 'Zerschnittene Streifen verrutschen als Glitch', fits: 'Störungen, Risiken, Sicherheitslücken, Fehler, Deepfakes', subs: ['horizontal', 'vertikal', 'Farbversatz'] },
  blende:    { name: 'Blende',    draw: drawBlende,    base: 5,   angles: [0, 0, -6, 6], align: true, fill: true, desc: 'Eine Fläche fährt über den Text und kehrt die Farben um', fits: 'Fokus, Enthüllung, Spotlight, Transparenz', subs: ['Balken', 'Quadrat', 'Band'] },
  pegel:     { name: 'Pegel',     draw: drawPegel,     base: 4,   angles: [0, 0, -4, 4], align: true, desc: 'Buchstaben schlagen aus wie ein Audiopegel', fits: 'Podcasts, Wachstum, Messwerte, Stimmung', subs: ['von unten', 'aus der Mitte', 'von oben'] },
};
const GRID_MOTIONS = ['fallblatt', 'raster'], GRID_TEXTURES = ['signature', 'dots'];
const COLOR_LBL = Object.fromEntries(Object.entries(SCHEMES).map(([k, v]) => [k, v.name]));
const TEX_LBL = { none: 'Keine', dots: 'Punkte', lines: 'Linien', scan: 'Scan', signature: 'Signatur' };
const STYLE_LBL = { fill: 'Gefüllt', outline: 'Outline', mixed: 'Gemischt' };
const WEIGHT_LBL = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
const TRACKS = [[-0.02, 'Eng'], [0, 'Normal'], [0.05, 'Weit'], [0.12, 'Sehr weit']];
const ALIGN_LBL = { left: 'links', center: 'zentriert', right: 'rechts' };
const ANGLES = [-14, -9, -5, 0, 5, 9, 14, 90, -90];

function recipeFor(key, variant) {
  const rnd = mulberry32(strHash(key + '#' + variant));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const motion = pick(Object.keys(MODES));
  const r = {
    motion,
    angle: pick(MODES[motion].angles),
    align: pick(['left', 'center', 'center', 'right']),
    scale: Math.round((0.82 + rnd() * 0.5) * 100) / 100,
    weight: pick([400, 500, 600, 700, 700]),
    style: pick(['fill', 'fill', 'outline', 'mixed']),
    tracking: pick([-0.02, 0, 0, 0.05, 0.12]),
    upper: rnd() < 0.72,
    font: rnd() < 0.16 ? 'mono' : 'grotesk',
    texture: pick(['none', 'dots', 'lines', 'scan', 'signature']),
    color: pickScheme(rnd),
    intensity: Math.round((0.25 + rnd() * 0.65) * 100) / 100,
    jitter: 0.88 + rnd() * 0.24,
    sub: Math.floor(rnd() * 3),
  };
  if (GRID_MOTIONS.includes(r.motion) && GRID_TEXTURES.includes(r.texture)) r.texture = r.texture === 'dots' ? 'lines' : 'none';
  return r;
}
function baseSpeed() {
  const r = Number(state.readMin);
  if (!r || r < 1) return 1;
  return clamp(1.22 - (r - 3) * 0.045, 0.75, 1.3); // short reads move faster, long reads calmer
}
function effective() {
  const rec = recipeFor(articleKey(), state.variant);
  const e = Object.assign({}, rec, state.overrides || {});
  if (!SCHEMES[e.color]) e.color = 'gruen';
  e.speed = (state.overrides && state.overrides.speed) || Math.round(baseSpeed() * rec.jitter * 100) / 100;
  return e;
}

/* ---------- fingerprint + memory rule ---------- */
const FP_W = { motion: 3, color: 2, hue: 1, texture: 1.5, angle: 1.5, style: 1.2, align: 0.6, weight: 0.6, track: 0.6, font: 0.6, upper: 0.4, sub: 0.5 };
function fingerprint(e) {
  return {
    motion: e.motion,
    sub: e.sub || 0,
    angle: e.angle === 0 ? '0' : (Math.abs(e.angle) === 90 ? 'v' : 't'),
    align: MODES[e.motion].align ? e.align : '-',
    style: e.style,
    weight: e.weight >= 600 ? 'b' : 'l',
    track: e.tracking < 0 ? 'n' : e.tracking >= 0.1 ? 'w' : e.tracking > 0 ? 'm' : '0',
    texture: e.texture, color: e.color, hue: (SCHEMES[e.color] || {}).hue || '?', font: e.font, upper: e.upper ? 'U' : 'l',
  };
}
function similarity(a, b) {
  let s = 0, t = 0;
  for (const k in FP_W) { t += FP_W[k]; if (a && b && a[k] === b[k]) s += FP_W[k]; }
  return s / t;
}
function recentOthers(key) {
  return memory.filter(m => m.key !== key).sort((a, b) => (b.savedAtMs || 0) - (a.savedAtMs || 0)).slice(0, 10);
}
function checkFp(fp, key) {
  const recent = recentOthers(key);
  let closest = null;
  for (const m of recent) { const sim = similarity(fp, m.fp); if (!closest || sim > closest.sim) closest = { entry: m, sim }; }
  const sameMotion = recent.slice(0, 2).find(m => m.fp && m.fp.motion === fp.motion);
  if (sameMotion) return { ok: false, closest, reason: 'motion', hit: sameMotion };
  if (closest && closest.sim >= 0.6) return { ok: false, closest, reason: 'similar', hit: closest.entry };
  return { ok: true, closest, count: recent.length };
}
function variantPasses(key, v) { return checkFp(fingerprint(Object.assign(recipeFor(key, v), { palette: 'x' })), key).ok; }
function findVariant(key, start, dir, avoid = []) {
  for (let i = 0; i < 400; i++) {
    const v = start + i * dir;
    if (v < 0) break;
    if (avoid.includes(recipeFor(key, v).motion)) continue;
    if (variantPasses(key, v)) return v;
  }
  return Math.max(0, start);
}

/* ---------- motions (each draws into rect R in the current, possibly rotated, frame) ---------- */

// Zylinder: every row wraps the text around a vertical cylinder; back faces show mirrored and dim.
function drawCylinder(R, p, S, L) {
  const { pal, fam, size, inten } = S;
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  const fs = Math.min(R.w, R.h * 1.15) * 0.092 * size;
  const rowH = fs * 1.06;
  const nRows = clamp(Math.floor((R.h - L.m * 0.6) / rowH), 1, 16);
  const radius = Math.min(R.w * 0.43, R.h * 0.8);
  const font = fontStr(S.weight, fs, fam);
  ctx.font = font; setLS(ctx, 0);
  const chars = [...(S.txt + ' ' + SEP + ' ')];
  const widths = chars.map(ch => ch === SEP ? fs * 0.62 : ctx.measureText(ch).width + fs * S.track);
  const unitW = widths.reduce((a, b) => a + b, 0);
  const reps = Math.max(1, Math.round(TAU * radius / unitW));
  const k = TAU / (reps * unitW);
  const capA = capAscent(font);
  const sq = fs * 0.3;
  const centers = [];
  let acc = 0;
  for (let i = 0; i < chars.length; i++) { centers.push(acc + widths[i] / 2); acc += widths[i]; }
  const back = [], front = [];
  for (let r = 0; r < nRows; r++) {
    const y = cy + (r - (nRows - 1) / 2) * rowH;
    const dirR = S.sub === 1 && r % 2 ? -1 : 1;
    const off = -dirR * TAU * p + r * inten * (S.sub === 2 ? 0.9 : 0.32) + Math.sin(TAU * p + r * 0.55) * inten * 0.55;
    for (let j = 0; j < reps; j++) {
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (ch === ' ') continue;
        const a = off + (j * unitW + centers[i]) * k;
        const z = Math.cos(a);
        (z > 0 ? front : back).push([ch, cx + Math.sin(a) * radius, y, z, r]);
      }
    }
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = pal.accent; ctx.strokeStyle = pal.accent;
  ctx.lineWidth = Math.max(1.2, fs * 0.035); ctx.lineJoin = 'round';
  const outlined = (row) => S.style === 'outline' || (S.style === 'mixed' && row % 2 === 1);
  const draw = (it) => {
    xf(it[3], 0, 0, 1, it[1], it[2]);
    if (it[0] === SEP) { ctx.fillStyle = pal.signal; ctx.beginPath(); rr(ctx, -sq / 2, -sq / 2, sq, sq, sq * 0.28); ctx.fill(); ctx.fillStyle = pal.accent; }
    else if (outlined(it[4])) ctx.strokeText(it[0], 0, capA / 2);
    else ctx.fillText(it[0], 0, capA / 2);
  };
  ctx.globalAlpha = 0.16;
  for (const it of back) draw(it);
  for (const it of front) { ctx.globalAlpha = 0.3 + 0.7 * Math.pow(it[3], 0.6); draw(it); }
  ctx.globalAlpha = 1;
  resetXf();
}

// Laufband: bands scroll in alternating directions, styled like the site's live ticker.
const TICKER_KINDS = { fill: ['band', 'plain', 'soft', 'plain'], outline: ['outline', 'ghost', 'band', 'ghost'], mixed: ['band', 'plain', 'outline', 'soft'] };
function drawTicker(R, p, S, L) {
  const { pal, fam, size } = S;
  const fs = Math.min(S.vis.w, S.vis.h) * 0.088 * size;
  const bh = fs * 1.5, gap = Math.max(2, fs * 0.09);
  const span = Math.hypot(R.w, R.h) + bh * 2;
  const font = fontStr(S.weight, fs, fam);
  ctx.font = font; setLS(ctx, fs * S.track);
  const txtW = ctx.measureText(S.txt).width;
  const gapW = fs * 0.6, sq = fs * 0.32;
  const unitW = txtW + gapW * 2 + sq;
  const capA = capAscent(font);
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const kinds = TICKER_KINDS[S.style] || TICKER_KINDS.mixed;
  const n = Math.ceil(span / bh) + 1;
  for (let i = 0; i < n; i++) {
    const idx = i - Math.floor(n / 2);
    const y = cy + idx * bh;
    const kind = kinds[((idx % 4) + 4) % 4];
    const odd = ((idx % 2) + 2) % 2;
    const dir = S.sub === 1 ? -1 : (odd ? 1 : -1);
    const off = dir * p * unitW * (S.sub === 2 && odd ? 2 : 1);
    let color = pal.fg, outline = false;
    if (kind === 'band') { ctx.fillStyle = pal.fill; ctx.fillRect(cx - span / 2, y - bh / 2 + gap / 2, span, bh - gap); color = pal.ink; }
    else if (kind === 'soft') { ctx.fillStyle = pal.band; ctx.fillRect(cx - span / 2, y - bh / 2 + gap / 2, span, bh - gap); }
    else if (kind === 'outline') { outline = true; color = pal.accent; }
    else if (kind === 'ghost') { outline = true; color = pal.fg; }
    const base = y + capA / 2;
    const sqc = kind === 'band' ? pal.ink : pal.signal;
    ctx.lineWidth = Math.max(1.5, fs * 0.032);
    for (let x = cx - span / 2 - unitW + (((off % unitW) + unitW) % unitW); x < cx + span / 2; x += unitW) {
      ctx.fillStyle = color; ctx.strokeStyle = color;
      if (outline) ctx.strokeText(S.txt, x, base); else ctx.fillText(S.txt, x, base);
      ctx.fillStyle = sqc; ctx.strokeStyle = sqc;
      ctx.beginPath(); rr(ctx, x + txtW + gapW, y - sq / 2, sq, sq, sq * 0.28);
      if (outline) ctx.stroke(); else ctx.fill();
    }
  }
  setLS(ctx, 0);
}

// Decode: characters scramble, lock into place, hold, then dissolve again.
const GLYPHS = '01#%&*+=/<>?ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
const decodeCache = new Map();
function decodeLayout(R, S, L) {
  const pad = L.m;
  const key = [S.txt, S.fam, S.size, S.weight, S.track, S.align, R.x, R.y, R.w, R.h, pad].join('|');
  let d = decodeCache.get(key);
  if (d) return d;
  const lh = 1.04;
  const f = fit(ctx, S.txt, (R.w - pad * 2) * 0.88, (R.h - pad * 2) * 0.74, Math.min(R.w * 0.22, R.h * 0.42) * S.size, S.weight, S.fam, lh, 99, S.track);
  const font = fontStr(S.weight, f.px, S.fam);
  const capA = capAscent(font);
  const sp = f.px * S.track;
  const lp = Math.max(12, L.u * 0.022);
  const labelGap = lp * 2.6;
  const blockH = f.lines.length * f.px * lh;
  const y0 = R.y + (R.h - blockH - labelGap) / 2 + labelGap;
  ctx.font = font; setLS(ctx, sp);
  const slots = [];
  let gi = 0, labelX = null;
  f.lines.forEach((line, li) => {
    const total = ctx.measureText(line).width - sp;
    const sx = S.align === 'center' ? R.x + (R.w - total) / 2 : S.align === 'right' ? R.x + R.w - pad - total - f.px * 0.55 : R.x + pad;
    if (labelX === null) labelX = sx;
    let acc = '';
    for (const ch of [...line]) {
      const x0 = ctx.measureText(acc).width;
      acc += ch;
      const x1 = ctx.measureText(acc).width;
      const w = x1 - x0 - sp;
      slots.push({ ch, x: sx + x0 + w / 2, w, y: y0 + li * f.px * lh + capA, i: gi++, line: li });
    }
  });
  setLS(ctx, 0);
  d = { font, px: f.px, capA, slots, lp, labelY: y0 - labelGap + lp, labelX: labelX ?? R.x + pad };
  if (decodeCache.size > 60) decodeCache.clear();
  decodeCache.set(key, d);
  return d;
}
function drawDecode(R, p, S, L) {
  const { pal, T } = S;
  const d = decodeLayout(R, S, L);
  const n = d.slots.length;
  const tick = Math.floor(p * T * 16);
  const IN_END = 0.42, OUT = 0.8;
  ctx.font = d.font; setLS(ctx, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = Math.max(1.2, d.px * 0.028); ctx.lineJoin = 'round';
  let locked = 0, total = 0, last = null, typing = false;
  for (const s of d.slots) {
    if (s.ch === ' ') continue;
    total++;
    const r = S.sub === 1 ? hash(s.i * 1.3 + 0.5) : S.sub === 2 ? Math.abs(s.i - (n - 1) / 2) / Math.max(1, (n - 1) / 2) : s.i / Math.max(1, n - 1);
    const lock = 0.06 + r * (IN_END - 0.1) + (hash(s.i * 3.1) - 0.5) * 0.05;
    const appear = Math.max(0.015, lock - 0.08 - hash(s.i * 7.7) * 0.07);
    const unlock = OUT + r * 0.1 + hash(s.i * 5.3) * 0.03;
    const vanish = unlock + 0.05;
    const st = p < appear ? 0 : p < lock ? 1 : p < unlock ? 2 : p < vanish ? 1 : 0;
    if (!st) continue;
    last = s;
    if (st === 2) {
      locked++;
      const col = (p - lock) < 0.06 ? pal.signal : pal.fg;
      const outline = S.style === 'outline' || (S.style === 'mixed' && s.line % 2 === 1);
      if (outline) { ctx.strokeStyle = col; ctx.strokeText(s.ch, s.x, s.y); }
      else { ctx.fillStyle = col; ctx.fillText(s.ch, s.x, s.y); }
    } else {
      typing = true;
      const g = GLYPHS[Math.floor(hash(s.i * 13.7 + tick * 1.618) * GLYPHS.length)];
      ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.85;
      ctx.fillText(g, s.x, s.y);
      ctx.globalAlpha = 1;
    }
  }
  const blinks = Math.max(2, Math.round(T * 1.25) * 2);
  if (typing || Math.floor(p * blinks) % 2 === 0) {
    const cw = d.px * 0.42, ch = d.capA;
    const cx = last ? last.x + last.w / 2 + d.px * 0.1 : d.labelX;
    const cy = last ? last.y : (d.slots[0] ? d.slots[0].y : R.y + R.h / 2);
    ctx.fillStyle = pal.signal;
    ctx.beginPath(); rr(ctx, cx, cy - ch, cw, ch, cw * 0.18); ctx.fill();
  }
  const pct = total ? Math.round(locked / total * 100) : 0;
  ctx.font = fontStr(500, d.lp, 'mono'); setLS(ctx, d.lp * 0.12);
  ctx.textAlign = 'left'; ctx.fillStyle = pal.muted;
  ctx.fillText(`${pct === 100 ? 'DECODED' : 'DECODE '} ${String(pct).padStart(3, '0')}%`, d.labelX, d.labelY);
  setLS(ctx, 0);
}

// Raster: the text becomes a field of rounded squares; a wave runs across it.
const maskCache = new Map();
function getMask(cols, rows, fitCols, fitRows, txt, S) {
  const key = [cols, rows, fitCols, fitRows, txt, S.fam, S.weight, S.track, S.align].join('|');
  let m = maskCache.get(key);
  if (m) return m;
  const ss = 6;
  const oc = document.createElement('canvas');
  oc.width = cols * ss; oc.height = rows * ss;
  const o = oc.getContext('2d', { willReadFrequently: true });
  const maxW = Math.max(4, fitCols - 4) * ss, maxH = Math.max(3, fitRows - 4) * ss;
  const f = fit(o, txt, maxW, maxH, Math.min(maxW * 0.3, maxH * 0.5), S.weight, S.fam, 1.0, 99, S.track);
  o.font = fontStr(S.weight, f.px, S.fam); setLS(o, f.px * S.track);
  o.fillStyle = '#fff'; o.textAlign = S.align; o.textBaseline = 'alphabetic';
  const capA = o.measureText('H').actualBoundingBoxAscent;
  const left = (oc.width - maxW) / 2;
  const ax = S.align === 'left' ? left : S.align === 'right' ? left + maxW : oc.width / 2;
  const blockH = f.lines.length * f.px;
  const y0 = (oc.height - blockH) / 2;
  f.lines.forEach((line, i) => o.fillText(line, ax, y0 + i * f.px + (f.px + capA) / 2));
  const data = o.getImageData(0, 0, oc.width, oc.height).data;
  const cov = new Float32Array(cols * rows);
  for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
    let sum = 0;
    for (let yy = 0; yy < ss; yy++) {
      let idx = ((gy * ss + yy) * oc.width + gx * ss) * 4 + 3;
      for (let xx = 0; xx < ss; xx++, idx += 4) sum += data[idx];
    }
    cov[gy * cols + gx] = sum / (255 * ss * ss);
  }
  m = { cov };
  if (maskCache.size > 24) maskCache.clear();
  maskCache.set(key, m);
  return m;
}
function drawRaster(R, p, S, L) {
  const { pal, size, inten } = S;
  const cell = Math.min(S.vis.w, S.vis.h) / (44 / size);
  const cols = Math.max(8, Math.floor(R.w / cell)), rows = Math.max(6, Math.floor(R.h / cell));
  const fitCols = Math.min(cols, Math.floor(S.vis.w / cell)), fitRows = Math.min(rows, Math.floor(S.vis.h / cell));
  const ox = R.x + (R.w - cols * cell) / 2, oy = R.y + (R.h - rows * cell) / 2;
  const mask = getMask(cols, rows, fitCols, fitRows, S.txt, S);
  const amp = 0.15 + 0.55 * inten;
  const freq = 0.5 + inten;
  const hi = pal.signal !== pal.accent ? pal.signal : pal.fg;
  const buckets = new Map();
  const push = (color, s, stroke, x, y) => {
    const lv = Math.round(s * 24) / 24;
    const key = color + '|' + lv + '|' + stroke;
    let b = buckets.get(key);
    if (!b) { b = { color, s: lv, stroke, pts: [] }; buckets.set(key, b); }
    b.pts.push(x, y);
  };
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const c = mask.cov[gy * cols + gx];
      const ph = S.sub === 1 ? Math.hypot(gx / cols - 0.5, (gy / rows - 0.5) * rows / cols) * 1.6 : S.sub === 2 ? gy / rows * 0.9 : gx / cols * 0.8 + gy / rows * 0.5;
      const w = 0.5 + 0.5 * Math.sin(TAU * (p - ph * freq));
      const x = ox + gx * cell + cell / 2, y = oy + gy * cell + cell / 2;
      if (c > 0.42) {
        const s = 0.92 - amp * (1 - w) * 0.6;
        const stroke = S.style === 'outline' || (S.style === 'mixed' && w < 0.6);
        push(w > 0.84 && inten > 0.12 ? hi : pal.accent, s, stroke, x, y);
      } else {
        push(pal.dim, 0.13 + 0.14 * w * inten, false, x, y);
      }
    }
  }
  ctx.lineWidth = Math.max(1, cell * 0.11);
  for (const b of buckets.values()) {
    const sz = cell * b.s * (b.stroke ? 0.92 : 1), h = sz / 2, r = sz * 0.28;
    ctx.beginPath();
    for (let i = 0; i < b.pts.length; i += 2) rr(ctx, b.pts[i] - h, b.pts[i + 1] - h, sz, sz, r);
    if (b.stroke) { ctx.strokeStyle = b.color; ctx.stroke(); } else { ctx.fillStyle = b.color; ctx.fill(); }
  }
}

// Echo: the text gets a swinging 3D extrusion; the depth direction orbits once per loop.
function drawEcho(R, p, S, L) {
  const { pal, fam, size, inten } = S;
  const pad = L.m * 1.2, lh = 1.0;
  const f = fit(ctx, S.txt, (R.w - pad * 2) * 0.8, (R.h - pad * 2) * 0.66, Math.min(R.w * 0.19, R.h * 0.34) * size, S.weight, fam, lh, 99, S.track);
  const font = fontStr(S.weight, f.px, fam);
  const capA = capAscent(font);
  const blockH = f.lines.length * f.px * lh;
  const ax = S.align === 'left' ? R.x + pad : S.align === 'right' ? R.x + R.w - pad : R.x + R.w / 2;
  const cy = R.y + R.h / 2;
  const n = Math.round(8 + 20 * inten);
  const depth = f.px * (0.55 + 1.1 * inten);
  const th = TAU * p;
  const ex = S.sub === 2 ? 0.15 : (S.align === 'center' ? 1 : 0.7), ey = S.sub === 1 ? 0.12 : S.sub === 2 ? 1 : 0.7;
  const dx = Math.cos(th) * ex, dy = Math.sin(th) * ey;
  ctx.font = font; setLS(ctx, f.px * S.track);
  ctx.textAlign = S.align; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const block = (ox, oy, sc, mode) => {
    xf(sc, 0, 0, sc, ax + ox, cy + oy);
    f.lines.forEach((line, i) => {
      const y = -blockH / 2 + i * f.px * lh + (f.px * lh + capA) / 2;
      if (mode === 'stroke') ctx.strokeText(line, 0, y); else ctx.fillText(line, 0, y);
    });
  };
  for (let i = n; i >= 1; i--) {
    const k = i / n;
    const sc = 1 - 0.14 * k;
    ctx.globalAlpha = 0.12 + 0.68 * Math.pow(1 - k, 1.4);
    ctx.strokeStyle = i === 1 ? (pal.signal !== pal.accent ? pal.signal : pal.fg) : pal.accent;
    ctx.lineWidth = Math.max(1.2, f.px * 0.011) / sc;
    block(dx * depth * k, dy * depth * k, sc, 'stroke');
  }
  ctx.globalAlpha = 1;
  if (S.style === 'outline') {
    ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(2, f.px * 0.03); block(0, 0, 1, 'stroke');
  } else if (S.style === 'mixed') {
    ctx.fillStyle = pal.bg; block(0, 0, 1, 'fill');
    ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(2, f.px * 0.024); block(0, 0, 1, 'stroke');
  } else {
    ctx.fillStyle = pal.accent; block(0, 0, 1, 'fill');
  }
  setLS(ctx, 0);
  resetXf();
}

// Welle: the variable weight axis travels through the letters as a wave.
function drawWave(R, p, S, L) {
  const { pal, fam, size, inten } = S;
  const pad = L.m, lh = 1.02;
  const f = fit(ctx, S.txt, (R.w - pad * 2) * 0.96, (R.h - pad * 2) * 0.86, Math.min(R.w * 0.2, R.h * 0.38) * size, 700, fam, lh, 99, S.track);
  const px = f.px;
  const capA = capAscent(fontStr(700, px, fam));
  const blockH = f.lines.length * px * lh;
  const fgc = rgb(pal.fg), acc = rgb(pal.accent);
  const minW = fam === 'mono' ? 200 : 300;
  const maxW = Math.max(500, S.weight);
  let gi = 0;
  setLS(ctx, 0);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  f.lines.forEach((line, li) => {
    const items = [...line].map((ch, ci, arr) => {
      const kw = 0.36 * (0.45 + inten);
      const ph = S.sub === 1 ? TAU * p - Math.abs(ci - (arr.length - 1) / 2) * kw * 1.3 - li * 0.6
        : S.sub === 2 ? TAU * p + (li % 2 ? 1 : -1) * ci * kw
        : TAU * p - gi * kw - li * 0.9;
      gi++;
      const wn = 0.5 + 0.5 * Math.sin(ph);
      const font = fontStr(Math.round(minW + (maxW - minW) * wn), px, fam);
      ctx.font = font;
      return { ch, wn, ph, font, w: ctx.measureText(ch).width + px * S.track };
    });
    const total = items.reduce((a, b) => a + b.w, 0) - px * S.track;
    let x = S.align === 'left' ? R.x + pad : S.align === 'right' ? R.x + R.w - pad - total : R.x + (R.w - total) / 2;
    const baseY = R.y + (R.h - blockH) / 2 + li * px * lh + (px * lh + capA) / 2;
    for (const it of items) {
      const dy = -Math.cos(it.ph) * px * 0.07 * inten;
      const sy = 1 + 0.16 * it.wn * inten;
      ctx.font = it.font;
      const col = mix(fgc, acc, Math.pow(it.wn, 1.6));
      xf(1, 0, 0, sy, x, baseY + dy);
      const outline = S.style === 'outline' || (S.style === 'mixed' && it.wn < 0.5);
      if (outline) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.2, px * 0.022); ctx.strokeText(it.ch, 0, 0); }
      else { ctx.fillStyle = col; ctx.fillText(it.ch, 0, 0); }
      x += it.w;
    }
  });
  resetXf();
}

/* ---------- shared helpers for the newer motions ---------- */
const easeIO = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
function visBox(R, S) { return { x: R.x + (R.w - S.vis.w) / 2, y: R.y + (R.h - S.vis.h) / 2, w: S.vis.w, h: S.vis.h }; }
function alignX(box, pad, align) { return align === 'left' ? box.x + pad : align === 'right' ? box.x + box.w - pad : box.x + box.w / 2; }
function unitChars(S, fs) {
  const chars = [...(S.txt + ' ' + SEP + ' ')];
  const widths = chars.map(ch => ch === SEP ? fs * 0.62 : ctx.measureText(ch).width + fs * S.track);
  const centers = [];
  let acc = 0;
  for (let i = 0; i < chars.length; i++) { centers.push(acc + widths[i] / 2); acc += widths[i]; }
  return { chars, widths, centers, unitW: acc };
}
const layoutCache = new Map();
function textBlock(R, S, L, wf = 0.9, hf = 0.8, lh = 1.0) {
  const pad = L.m;
  const key = ['tb', S.txt, S.fam, S.weight, S.track, S.align, S.size, R.x | 0, R.y | 0, R.w | 0, R.h | 0, pad, wf, hf, lh].join('|');
  let b = layoutCache.get(key);
  if (b) return b;
  const f = fit(ctx, S.txt, (R.w - pad * 2) * wf, (R.h - pad * 2) * hf, Math.min(R.w * 0.22, R.h * 0.42) * S.size, S.weight, S.fam, lh, 99, S.track);
  const font = fontStr(S.weight, f.px, S.fam);
  const capA = capAscent(font);
  ctx.font = font; setLS(ctx, 0);
  const sp = f.px * S.track;
  const blockH = f.lines.length * f.px * lh;
  const top = R.y + (R.h - blockH) / 2;
  const lines = [], chars = [];
  let gi = 0;
  f.lines.forEach((line, li) => {
    const cs = [...line];
    const ws = cs.map(ch => ctx.measureText(ch).width + sp);
    const total = ws.reduce((a, c) => a + c, 0) - sp;
    const x0 = S.align === 'left' ? R.x + pad : S.align === 'right' ? R.x + R.w - pad - total : R.x + (R.w - total) / 2;
    const base = top + li * f.px * lh + (f.px * lh + capA) / 2;
    let x = x0;
    cs.forEach((ch, ci) => { chars.push({ ch, x: x + (ws[ci] - sp) / 2, w: ws[ci] - sp, y: base, i: gi++, line: li, n: cs.length, ci }); x += ws[ci]; });
    lines.push({ text: line, x0, base, total });
  });
  b = { px: f.px, font, capA, lines, chars, blockH, top };
  if (layoutCache.size > 120) layoutCache.clear();
  layoutCache.set(key, b);
  return b;
}

// Takt: word by word on the beat, filling the window; every beat gets its own treatment.
function drawTakt(R, p, S, L) {
  const { pal, fam, inten } = S;
  const box = visBox(R, S);
  const words = S.txt.split(' ').filter(Boolean);
  const beats = words.length >= 2 ? words.slice(0, 8) : [words[0], words[0], words[0]];
  const n = beats.length;
  const idx = Math.min(n - 1, Math.floor(p * n)), q = p * n - idx;
  const word = beats[idx];
  const pad = L.m;
  const f = fit(ctx, word, (box.w - pad * 2) * 0.94, (box.h - pad * 2) * 0.7, box.h * 0.6 * S.size, S.weight, fam, 1, 1, S.track);
  const kinds = { fill: ['plain', 'flash', 'fg'], outline: ['outline', 'ghost', 'flash'], mixed: ['flash', 'outline', 'plain'] }[S.style] || ['plain', 'flash', 'fg'];
  const kind = kinds[(idx + S.sub) % 3];
  const e = easeOut(clamp(q / 0.22, 0, 1));
  const sc = 1 + (0.1 + 0.3 * inten) * (1 - e);
  const rot = (hash(idx * 7.3 + S.sub * 2.1) - 0.5) * inten * 0.12 * (1 - 0.7 * e);
  if (kind === 'flash') { ctx.fillStyle = pal.fill; ctx.fillRect(R.x, R.y, R.w, R.h); }
  const font = fontStr(S.weight, f.px, fam);
  const capA = capAscent(font);
  ctx.font = font; setLS(ctx, f.px * S.track);
  const cs = Math.cos(rot) * sc, sn = Math.sin(rot) * sc;
  xf(cs, sn, -sn, cs, alignX(box, pad, S.align), box.y + box.h / 2);
  ctx.textAlign = S.align; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, f.px * 0.026);
  const hiT = pal.signal !== pal.accent ? pal.signal : pal.fg;
  const col = kind === 'flash' ? pal.ink : kind === 'fg' ? hiT : kind === 'ghost' ? pal.fg : pal.accent;
  if (kind === 'outline' || kind === 'ghost') { ctx.strokeStyle = col; ctx.strokeText(word, 0, capA / 2); }
  else { ctx.fillStyle = col; ctx.fillText(word, 0, capA / 2); }
  resetXf(); setLS(ctx, 0);
  const lp = Math.max(12, L.u * 0.022);
  ctx.font = fontStr(500, lp, 'mono'); setLS(ctx, lp * 0.12);
  ctx.textAlign = 'left'; ctx.fillStyle = kind === 'flash' ? pal.ink : pal.muted;
  ctx.fillText(`${String(idx + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`, box.x + pad, box.y + pad + lp);
  setLS(ctx, 0);
}

// Fallblatt: split-flap tiles like the SBB departure boards; letters flip in, hold, flip out.
const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&%+-';
const flapCache = new Map();
function flapLayout(box, S, L) {
  const txt = S.txt.toLocaleUpperCase('de-CH');
  const pad = L.m * 0.45;
  const key = [txt, box.x | 0, box.y | 0, box.w | 0, box.h | 0, pad, S.align, S.size].join('|');
  let F = flapCache.get(key);
  if (F) return F;
  const words = txt.split(' ').filter(Boolean);
  const longest = Math.max(1, ...words.map(w => [...w].length));
  const total = [...txt].length;
  let best = null;
  for (let C = longest; C <= Math.max(longest, total); C++) {
    const lines = [];
    let cur = '';
    for (const w of words) { const test = cur ? cur + ' ' + w : w; if ([...test].length <= C) cur = test; else { if (cur) lines.push(cur); cur = w; } }
    if (cur) lines.push(cur);
    const pitch = Math.min((box.w - pad * 2) / C, (box.h - pad * 2) / (lines.length * 1.45));
    if (!best || pitch > best.pitch * 1.001) best = { C, lines, pitch };
  }
  const pitch = best.pitch * Math.min(1, S.size);
  const tw = pitch * 0.9, th = pitch * 1.32, py = pitch * 1.45;
  const ox = box.x + (box.w - best.C * pitch) / 2, oy = box.y + (box.h - best.lines.length * py) / 2;
  const tiles = [];
  best.lines.forEach((line, r) => {
    const chars = [...line];
    const startCol = S.align === 'left' ? 0 : S.align === 'right' ? best.C - chars.length : Math.floor((best.C - chars.length) / 2);
    for (let c = 0; c < best.C; c++) {
      const ch = (c >= startCol && c < startCol + chars.length) ? chars[c - startCol] : ' ';
      tiles.push({ ch, x: ox + c * pitch + (pitch - tw) / 2, y: oy + r * py + (py - th) / 2, w: tw, h: th, col: c, row: r });
    }
  });
  F = { tiles, px: th * 0.62, cols: best.C, rows: best.lines.length };
  if (flapCache.size > 30) flapCache.clear();
  flapCache.set(key, F);
  return F;
}
function drawFlap(tl, A, B, f, capA, c) {
  const { x, y, w, h } = tl;
  const mid = y + h / 2;
  ctx.fillStyle = c.tile; ctx.beginPath(); rr(ctx, x, y, w, h, w * 0.09); ctx.fill();
  const glyph = (ch, top) => {
    if (ch === ' ') return;
    ctx.save(); ctx.beginPath(); ctx.rect(x, top ? y : mid, w, h / 2); ctx.clip();
    if (c.outline) { ctx.strokeStyle = c.text; ctx.strokeText(ch, x + w / 2, mid + capA / 2); }
    else { ctx.fillStyle = c.text; ctx.fillText(ch, x + w / 2, mid + capA / 2); }
    ctx.restore();
  };
  if (f === null) { glyph(B, true); glyph(B, false); }
  else {
    glyph(B, true); glyph(A, false);
    const top = f < 0.5;
    const s = Math.max(0.001, top ? 1 - f * 2 : (f - 0.5) * 2);
    ctx.save();
    ctx.transform(1, 0, 0, s, 0, mid * (1 - s));
    ctx.beginPath(); ctx.rect(x, top ? y : mid, w, h / 2); ctx.clip();
    ctx.fillStyle = c.tile; ctx.fillRect(x, top ? y : mid, w, h / 2);
    glyph(top ? A : B, top);
    ctx.fillStyle = `rgba(0,0,0,${(0.3 * (1 - s)).toFixed(3)})`; ctx.fillRect(x, top ? y : mid, w, h / 2);
    ctx.restore();
  }
  ctx.fillStyle = c.split; ctx.fillRect(x, mid - Math.max(1, h * 0.012), w, Math.max(2, h * 0.024));
}
function drawFallblatt(R, p, S, L) {
  const { pal, fam, T } = S;
  const box = visBox(R, S);
  const F = flapLayout(box, S, L);
  const font = fontStr(S.weight, F.px, fam);
  const capA = capAscent(font);
  ctx.font = font; setLS(ctx, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.2, F.px * 0.03);
  const N = F.tiles.length;
  const flipDur = clamp(0.15 / T, 0.012, 0.04);
  F.tiles.forEach((tl, i) => {
    const order = S.sub === 1 ? hash(i * 3.3)
      : S.sub === 2 ? clamp(Math.abs(tl.col - (F.cols - 1) / 2) / Math.max(1, F.cols / 2) * 0.8 + tl.row * 0.08, 0, 1)
      : (tl.row * F.cols + tl.col) / Math.max(1, N);
    const start = 0.03 + order * 0.24;
    const flips = tl.ch === ' ' ? 0 : 3 + Math.floor(hash(i * 5.7) * 5);
    const seq = (j) => j >= flips ? tl.ch : FLAP[Math.floor(hash(i * 31.7 + j * 7.3) * FLAP.length)];
    const outStart = 0.8 + order * 0.12;
    let A = ' ', B = ' ', f = null;
    if (tl.ch !== ' ' && p >= outStart) {
      const k = (p - outStart) / (flipDur * 1.4);
      if (k < 1) { A = tl.ch; f = k; }
    } else if (flips > 0 && p >= start) {
      const ti = p - start;
      const j = Math.floor(ti / flipDur);
      if (j >= flips) B = tl.ch;
      else { A = j === 0 ? ' ' : seq(j - 1); B = seq(j); f = ti / flipDur - j; }
    }
    const settled = start + flips * flipDur;
    const hot = tl.ch !== ' ' && p >= settled && p - settled < 0.05 && p < outStart;
    const accentTile = S.style === 'mixed' && tl.ch !== ' ' && hash(i * 9.9 + 3) < 0.28;
    drawFlap(tl, A, B, f, capA, {
      tile: accentTile ? pal.fill : pal.band,
      text: accentTile ? pal.ink : (hot ? (pal.signal !== pal.fg ? pal.signal : pal.accent) : pal.fg),
      split: pal.bg,
      outline: S.style === 'outline' && !accentTile,
    });
  });
}

// Ring: the text runs around 2–4 concentric rings turning in opposite directions.
function drawRing(R, p, S, L) {
  const { pal, fam, inten } = S;
  const box = visBox(R, S);
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const maxR = Math.min(box.w, box.h) / 2 - L.m * 0.3;
  const n = 2 + (S.sub % 3);
  const g = maxR / (n + 0.55);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  for (let k = 0; k < n; k++) {
    const radius = maxR - g * (k + 0.5) + Math.sin(TAU * p * 2 + k) * g * 0.06 * inten;
    if (radius < g * 0.9) break;
    const fs = g * 0.62 * clamp(S.size, 0.7, 1.1);
    const font = fontStr(S.weight, fs, fam);
    ctx.font = font; setLS(ctx, 0);
    const capA = capAscent(font);
    const U = unitChars(S, fs);
    const reps = Math.max(1, Math.round(TAU * radius / U.unitW));
    const kk = TAU / (reps * U.unitW);
    const rot = (k % 2 ? 1 : -1) * TAU * p + k * 0.9;
    const outline = S.style === 'outline' || (S.style === 'mixed' && k % 2 === 1);
    const ringCols = pal.signal !== pal.accent && pal.signal !== pal.fg ? [pal.accent, pal.fg, pal.signal] : [pal.accent, pal.fg];
    const col = ringCols[k % ringCols.length];
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.2, fs * 0.035);
    const sq = fs * 0.3;
    for (let j = 0; j < reps; j++) {
      for (let i = 0; i < U.chars.length; i++) {
        const ch = U.chars[i];
        if (ch === ' ') continue;
        const a = rot + (j * U.unitW + U.centers[i]) * kk - Math.PI / 2;
        const ta = a + Math.PI / 2, c = Math.cos(ta), s = Math.sin(ta);
        xf(c, s, -s, c, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        if (ch === SEP) { ctx.fillStyle = pal.signal; ctx.beginPath(); rr(ctx, -sq / 2, -sq / 2, sq, sq, sq * 0.28); ctx.fill(); ctx.fillStyle = col; }
        else if (outline) ctx.strokeText(ch, 0, capA / 2);
        else ctx.fillText(ch, 0, capA / 2);
      }
    }
  }
  resetXf();
  const core = (maxR - g * n) * 1.05;
  if (core > 6) { ctx.fillStyle = pal.signal; ctx.beginPath(); rr(ctx, cx - core / 2, cy - core / 2, core, core, core * 0.28); ctx.fill(); }
}

// Schlaufe: the text travels along an endless track (figure eight, race track or wave).
const pathCache = new Map();
function buildPath(sub, w, h) {
  const key = [sub, w | 0, h | 0].join('|');
  let P = pathCache.get(key);
  if (P) return P;
  const pts = [];
  let closed = true;
  if (sub === 0) {
    const a = w * 0.44;
    const ys = Math.min(2.4, (h * 0.36) / (a * 0.354));
    for (let i = 0; i < 720; i++) { const t = i / 720 * TAU, s = Math.sin(t), c = Math.cos(t), d = 1 + s * s; pts.push([a * c / d, ys * a * s * c / d]); }
  } else if (sub === 1) {
    const iw = w * 0.82, ih = h * 0.78, r = Math.min(iw, ih) * 0.24;
    const sw = iw - 2 * r, sh = ih - 2 * r, arc = Math.PI * r / 2;
    const segs = [
      ['l', -iw / 2 + r, -ih / 2, 1, 0, sw], ['a', iw / 2 - r, -ih / 2 + r, -Math.PI / 2, arc],
      ['l', iw / 2, -ih / 2 + r, 0, 1, sh], ['a', iw / 2 - r, ih / 2 - r, 0, arc],
      ['l', iw / 2 - r, ih / 2, -1, 0, sw], ['a', -iw / 2 + r, ih / 2 - r, Math.PI / 2, arc],
      ['l', -iw / 2, ih / 2 - r, 0, -1, sh], ['a', -iw / 2 + r, -ih / 2 + r, Math.PI, arc],
    ];
    const per = 2 * sw + 2 * sh + 4 * arc;
    const M = 900;
    for (let i = 0; i < M; i++) {
      let s = i / M * per;
      for (const sg of segs) {
        const len = sg[0] === 'l' ? sg[5] : sg[4];
        if (s <= len) {
          if (sg[0] === 'l') pts.push([sg[1] + sg[3] * s, sg[2] + sg[4] * s]);
          else { const ang = sg[3] + s / r; pts.push([sg[1] + Math.cos(ang) * r, sg[2] + Math.sin(ang) * r]); }
          break;
        }
        s -= len;
      }
    }
  } else {
    closed = false;
    const A = h * 0.22, cyc = 1.5;
    for (let i = 0; i <= 600; i++) { const x = -w * 0.62 + i / 600 * w * 1.24; pts.push([x, A * Math.sin(x / w * TAU * cyc)]); }
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  let total = cum[cum.length - 1];
  if (closed) total += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  P = { pts, cum, total, closed };
  if (pathCache.size > 30) pathCache.clear();
  pathCache.set(key, P);
  return P;
}
function pathAt(P, s) {
  const { pts, cum } = P;
  const last = cum.length - 1;
  if (P.closed) s = ((s % P.total) + P.total) % P.total;
  else if (s < 0 || s > cum[last]) return null;
  let a, b, t;
  if (s >= cum[last]) { a = pts[last]; b = pts[0]; const L0 = P.total - cum[last]; t = L0 ? (s - cum[last]) / L0 : 0; }
  else {
    let lo = 0, hi = last;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    a = pts[lo]; b = pts[hi]; t = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
  }
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}
function drawPfad(R, p, S, L) {
  const { pal, fam } = S;
  const box = visBox(R, S);
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const P = buildPath(S.sub % 3, box.w, box.h);
  const fs = Math.min(box.w, box.h) * 0.07 * S.size;
  const font = fontStr(S.weight, fs, fam);
  ctx.font = font; setLS(ctx, 0);
  const capA = capAscent(font);
  const U = unitChars(S, fs);
  let adv = 1, reps;
  if (P.closed) { reps = Math.max(1, Math.round(P.total / U.unitW)); adv = P.total / (reps * U.unitW); }
  else reps = Math.ceil(P.total / U.unitW) + 2;
  const alternate = !P.closed || reps % 2 === 0;
  const off = p * U.unitW * adv * 2; // two units per loop keeps the colour alternation seamless
  ctx.strokeStyle = pal.dim; ctx.lineWidth = fs * 1.35; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  P.pts.forEach((pt, i) => { if (i) ctx.lineTo(cx + pt[0], cy + pt[1]); else ctx.moveTo(cx + pt[0], cy + pt[1]); });
  if (P.closed) ctx.closePath();
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = Math.max(1.2, fs * 0.035);
  const sq = fs * 0.3;
  for (let j = P.closed ? 0 : -1; j < reps; j++) {
    const odd = alternate && ((j % 2) + 2) % 2 === 1;
    const outline = S.style === 'outline' || (S.style === 'mixed' && odd);
    const col = odd ? pal.fg : pal.accent;
    ctx.fillStyle = col; ctx.strokeStyle = col;
    for (let i = 0; i < U.chars.length; i++) {
      const ch = U.chars[i];
      if (ch === ' ') continue;
      const pt = pathAt(P, off + (j * U.unitW + U.centers[i]) * adv);
      if (!pt) continue;
      const c = Math.cos(pt.ang), s = Math.sin(pt.ang);
      xf(c, s, -s, c, cx + pt.x, cy + pt.y);
      if (ch === SEP) { ctx.fillStyle = pal.signal; ctx.beginPath(); rr(ctx, -sq / 2, -sq / 2, sq, sq, sq * 0.28); ctx.fill(); ctx.fillStyle = col; }
      else if (outline) ctx.strokeText(ch, 0, capA / 2);
      else ctx.fillText(ch, 0, capA / 2);
    }
  }
  resetXf();
}

// Streuung: letters gather out of chaos into the word, hold, then scatter again.
function drawStreuung(R, p, S, L) {
  const { pal, inten } = S;
  const box = visBox(R, S);
  const b = textBlock(box, S, L, 0.9, 0.66, 1.02);
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const n = b.chars.length;
  ctx.font = b.font; setLS(ctx, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.2, b.px * 0.026);
  for (const c of b.chars) {
    if (c.ch === ' ') continue;
    const h1 = hash(c.i * 3.7 + S.sub * 11), h2 = hash(c.i * 9.1 + 1), h3 = hash(c.i * 5.3 + 2);
    let sx, sy;
    if (S.sub === 1) { const a = h1 * TAU, d = (0.55 + 0.45 * h2) * Math.hypot(box.w, box.h) / 2; sx = cx + Math.cos(a) * d; sy = cy + Math.sin(a) * d; }
    else if (S.sub === 2) { sx = c.x + (h1 - 0.5) * box.w * 0.35; sy = box.y - b.px * (0.6 + h2 * 2.5); }
    else { sx = box.x + h1 * box.w; sy = box.y + h2 * box.h; }
    sx += Math.sin(TAU * p + h1 * 6) * box.w * 0.02 * inten;
    sy += Math.cos(TAU * p + h2 * 6) * box.h * 0.02 * inten;
    const srot = (h3 - 0.5) * TAU * 0.8 * (0.4 + inten), ssc = 0.5 + h2 * 1.2;
    const ord = c.i / Math.max(1, n - 1);
    const a0 = 0.06 + ord * 0.22 + h3 * 0.05, d0 = 0.72 + ord * 0.1 + h1 * 0.02;
    const k = p < a0 ? 0 : p < a0 + 0.16 ? easeIO((p - a0) / 0.16) : p < d0 ? 1 : p < d0 + 0.14 ? 1 - easeIO((p - d0) / 0.14) : 0;
    const x = sx + (c.x - sx) * k, y = sy + (c.y - sy) * k;
    const rot = srot * (1 - k), sc = ssc + (1 - ssc) * k;
    const cs = Math.cos(rot) * sc, sn = Math.sin(rot) * sc;
    xf(cs, sn, -sn, cs, x, y - b.capA / 2);
    const col = k >= 1 ? (p - (a0 + 0.16) < 0.05 ? pal.signal : pal.fg) : pal.accent;
    ctx.globalAlpha = k >= 1 ? 1 : 0.45 + 0.55 * k;
    const outline = S.style === 'outline' || (S.style === 'mixed' && k < 1);
    if (outline) { ctx.strokeStyle = col; ctx.strokeText(c.ch, 0, b.capA / 2); }
    else { ctx.fillStyle = col; ctx.fillText(c.ch, 0, b.capA / 2); }
  }
  ctx.globalAlpha = 1;
  resetXf();
}

// Stapel: the words click into place like a slot reel.
function drawStapel(R, p, S, L) {
  const { pal, fam } = S;
  const box = visBox(R, S);
  const pad = L.m;
  const words = S.txt.split(' ').filter(Boolean);
  const items = words.length >= 2 ? words.slice(0, 8) : [words[0], words[0]];
  const n = items.length;
  let px = Infinity;
  for (const it of items) px = Math.min(px, fit(ctx, it, (box.w - pad * 2) * 0.92, box.h * 0.26, box.h * 0.24 * S.size, S.weight, fam, 1, 1, S.track).px);
  const font = fontStr(S.weight, px, fam);
  const capA = capAscent(font);
  const rowH = px * 1.16;
  const steps = n < 3 ? n * 2 : n;
  const sp = p * steps, step = Math.floor(sp), q = sp - step;
  const pos = step + (q < 0.42 ? easeIO(q / 0.42) : 1);
  const dir = S.sub === 1 ? -1 : 1;
  const cy = box.y + box.h / 2;
  const ax = alignX(box, pad, S.align);
  ctx.strokeStyle = pal.signal !== pal.accent ? pal.signal : pal.dim; ctx.lineWidth = Math.max(1.5, px * 0.03);
  ctx.beginPath(); rr(ctx, box.x + pad * 0.5, cy - rowH / 2, box.w - pad, rowH, rowH * 0.18); ctx.stroke();
  ctx.font = font; setLS(ctx, px * S.track);
  ctx.textAlign = S.align; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, px * 0.026);
  const half = Math.ceil(box.h / rowH / 2) + 2;
  for (let r = -half; r <= half; r++) {
    const idx = Math.floor(pos) + r;
    const d = idx - pos;
    const item = items[((idx % n) + n) % n];
    let y = cy + d * rowH * dir, sy = 1;
    if (S.sub === 2) { const ang = d * 0.42; if (Math.abs(ang) >= Math.PI / 2) continue; y = cy + Math.sin(ang) * rowH / 0.42 * dir; sy = Math.cos(ang); }
    const dist = Math.abs(d);
    const active = dist < 0.5;
    ctx.globalAlpha = active ? 1 : Math.max(0.12, 1 - dist * 0.3);
    xf(1, 0, 0, sy, ax, y);
    if (active) {
      if (S.style === 'outline') { ctx.strokeStyle = pal.accent; ctx.strokeText(item, 0, capA / 2); }
      else { ctx.fillStyle = pal.accent; ctx.fillText(item, 0, capA / 2); }
    } else if (S.style === 'fill') { ctx.fillStyle = pal.fg; ctx.fillText(item, 0, capA / 2); }
    else { ctx.strokeStyle = pal.fg; ctx.strokeText(item, 0, capA / 2); }
  }
  ctx.globalAlpha = 1;
  resetXf(); setLS(ctx, 0);
}

// Schnitt: the text is cut into strips that slip against each other in glitch bursts.
const sliceCache = new Map();
function sliceSource(box, S, L, color) {
  const w = Math.max(1, Math.round(box.w)), h = Math.max(1, Math.round(box.h));
  const key = [S.txt, S.fam, S.weight, S.track, S.align, S.size, S.style, w, h, color].join('|');
  let c = sliceCache.get(key);
  if (c) return c;
  const b = textBlock({ x: 0, y: 0, w, h }, S, L, 0.9, 0.72, 1.0);
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const o = c.getContext('2d');
  o.font = b.font; setLS(o, b.px * S.track);
  o.textAlign = 'left'; o.textBaseline = 'alphabetic'; o.lineJoin = 'round';
  o.lineWidth = Math.max(1.5, b.px * 0.026);
  o.fillStyle = color; o.strokeStyle = color;
  b.lines.forEach((ln, i) => {
    const outline = S.style === 'outline' || (S.style === 'mixed' && i % 2 === 1);
    if (outline) o.strokeText(ln.text, ln.x0, ln.base); else o.fillText(ln.text, ln.x0, ln.base);
  });
  if (sliceCache.size > 16) sliceCache.clear();
  sliceCache.set(key, c);
  return c;
}
function drawSchnitt(R, p, S, L) {
  const { pal, inten, T } = S;
  const box = visBox(R, S);
  const bx = Math.round(box.x), by = Math.round(box.y);
  const src = sliceSource(box, S, L, pal.accent);
  const w = src.width, h = src.height;
  const bump = (c, wd) => Math.pow(Math.max(0, 1 - Math.abs(p - c) / wd), 2);
  const env = bump(0.3, 0.09) + bump(0.62, 0.05) + bump(0.82, 0.07);
  const tick = Math.floor(p * T * 14);
  const A = w * (0.004 + 0.22 * env * (0.35 + inten));
  const N = 7 + Math.round(inten * 12);
  if (S.sub === 2) {
    const src2 = sliceSource(box, S, L, pal.signal !== pal.accent ? pal.signal : pal.fg);
    const d = A * 0.5 + w * 0.004;
    ctx.globalAlpha = 0.7; ctx.drawImage(src2, bx + d, by - d * 0.3); ctx.globalAlpha = 1;
  }
  for (let k = 0; k < N; k++) {
    const off = env > 0.02 ? A * (hash(k * 7.1 + tick * 1.37) - 0.5) * 2 : A * Math.sin(TAU * p * 2 + k * 1.7) * 0.25;
    if (S.sub === 1) {
      const sx = Math.round(k * w / N), sw = Math.round((k + 1) * w / N) - sx;
      if (sw > 0) ctx.drawImage(src, sx, 0, sw, h, bx + sx, by + off, sw, h);
    } else {
      const sy = Math.round(k * h / N), sh = Math.round((k + 1) * h / N) - sy;
      if (sh > 0) ctx.drawImage(src, 0, sy, w, sh, bx + off, by + sy, w, sh);
    }
  }
}

// Blende: a rounded shape travels over the text and flips its colours where it passes.
function drawBlende(R, p, S, L) {
  const { pal, inten } = S;
  const box = visBox(R, S);
  const b = textBlock(box, S, L, 0.88, 0.72, 1.0);
  const lines = (stroke) => { for (const ln of b.lines) { if (stroke) ctx.strokeText(ln.text, ln.x0, ln.base); else ctx.fillText(ln.text, ln.x0, ln.base); } };
  ctx.font = b.font; setLS(ctx, b.px * S.track);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, b.px * 0.022);
  if (S.style === 'outline') { ctx.strokeStyle = pal.fg; lines(true); }
  else if (S.style === 'mixed') { ctx.fillStyle = pal.dim; lines(false); ctx.strokeStyle = pal.fg; ctx.globalAlpha = 0.55; lines(true); ctx.globalAlpha = 1; }
  else { ctx.fillStyle = pal.fg; lines(false); }
  ctx.save();
  ctx.beginPath();
  const sub = S.sub % 3;
  if (sub === 0) { const bw = box.w * (0.26 + 0.22 * inten); const x = R.x - bw + easeIO(p) * (R.w + bw); rr(ctx, x, R.y, bw, R.h, Math.min(bw, R.h) * 0.08); }
  else if (sub === 1) { const s = Math.pow(Math.sin(Math.PI * p), 1.4) * Math.hypot(box.w, box.h) * (0.75 + 0.35 * inten); rr(ctx, box.x + box.w / 2 - s / 2, box.y + box.h / 2 - s / 2, s, s, s * 0.28); }
  else { const bh = box.h * (0.3 + 0.2 * inten); const y = R.y - bh + easeIO(p) * (R.h + bh); rr(ctx, R.x, y, R.w, bh, Math.min(bh, R.w) * 0.1); }
  ctx.clip();
  ctx.fillStyle = pal.fill; ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.fillStyle = pal.ink; lines(false);
  ctx.restore();
  setLS(ctx, 0);
}

// Pegel: every letter swings like a level meter, with a faint column behind it.
function drawPegel(R, p, S, L) {
  const { pal, inten } = S;
  const box = visBox(R, S);
  const b = textBlock(box, S, L, 0.9, 0.62, 1.55);
  const fgc = rgb(pal.fg), acc = rgb(pal.accent);
  const capA = b.capA;
  const amp = 0.7 + 0.7 * inten;
  ctx.font = b.font; setLS(ctx, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.2, b.px * 0.024);
  for (const c of b.chars) {
    if (c.ch === ' ') continue;
    const m = 1 + (hash(c.i * 4.4) > 0.6 ? 1 : 0);
    const lvl = Math.abs(Math.sin(TAU * p * m + hash(c.i * 2.2) * TAU));
    const sy = 0.45 + amp * lvl;
    const anchor = S.sub === 1 ? c.y - capA / 2 : S.sub === 2 ? c.y - capA : c.y;
    const dyText = S.sub === 1 ? capA / 2 : S.sub === 2 ? capA : 0;
    const barH = capA * sy * 1.06;
    const top = S.sub === 1 ? anchor - barH / 2 : S.sub === 2 ? anchor - capA * 0.03 : anchor - barH;
    resetXf();
    ctx.fillStyle = pal.dim;
    ctx.beginPath(); rr(ctx, c.x - c.w * 0.5, top, c.w, barH, Math.min(c.w, barH) * 0.14); ctx.fill();
    xf(1, 0, 0, sy, c.x, anchor);
    const col = sy > 1.38 && pal.signal !== pal.accent ? pal.signal : mix(fgc, acc, clamp((sy - 0.9) / 0.6, 0, 1));
    const outline = S.style === 'outline' || (S.style === 'mixed' && sy < 1);
    if (outline) { ctx.strokeStyle = col; ctx.strokeText(c.ch, 0, dyText); }
    else { ctx.fillStyle = col; ctx.fillText(c.ch, 0, dyText); }
  }
  resetXf();
}

function heroPhase(e = effective()) {
  const words = kineticText(e).split(' ').filter(Boolean).length;
  switch (e.motion) {
    case 'decode': return 0.6;
    case 'fallblatt': return 0.68;
    case 'streuung': return 0.6;
    case 'takt': { const n = words >= 2 ? Math.min(8, words) : 3; return 0.3 / n; }
    case 'stapel': { const n = words >= 2 ? Math.min(8, words) : 2; return 0.6 / (n < 3 ? n * 2 : n); }
    default: return 0;
  }
}

const ALT_MOTION = {
  de: {
    cylinder: 'läuft in mehreren Reihen um eine rotierende Walze', ticker: 'läuft auf schrägen, gegenläufigen Bändern durchs Bild',
    decode: 'entschlüsselt sich Zeichen für Zeichen aus zufälligen Symbolen', raster: 'erscheint als Pixelfeld aus abgerundeten Quadraten, über das eine Lichtwelle läuft',
    echo: 'hat eine schwingende räumliche Tiefe aus vielen Konturen', wave: 'pulsiert, weil das Schriftgewicht wellenförmig durch die Buchstaben läuft',
    takt: 'erscheint Wort für Wort im Takt und füllt das Bild', fallblatt: 'klappt Buchstabe für Buchstabe ein wie an einer Fallblattanzeige im Bahnhof',
    ring: 'kreist auf gegenläufigen Ringen um ein Quadrat in der Mitte', pfad: 'fliesst auf einer Endlosbahn durchs Bild',
    streuung: 'setzt sich aus verstreuten Buchstaben zusammen und zerfällt wieder', stapel: 'rastet Wort für Wort ein wie eine Walze',
    schnitt: 'ist in Streifen zerschnitten, die wie ein Bildfehler gegeneinander verrutschen', blende: 'wird von einer farbigen Fläche überfahren, die die Farben umkehrt',
    pegel: 'schlägt Buchstabe für Buchstabe aus wie ein Audiopegel',
  },
  en: {
    cylinder: 'runs in several rows around a rotating cylinder', ticker: 'runs across the image on tilted bands moving in opposite directions',
    decode: 'decodes character by character out of random symbols', raster: 'appears as a pixel field of rounded squares with a wave of light passing over it',
    echo: 'has a swinging three-dimensional depth made of many outlines', wave: 'pulses as the font weight moves through the letters like a wave',
    takt: 'appears word by word on the beat, filling the frame', fallblatt: 'flips in letter by letter like a split-flap departure board',
    ring: 'circles on counter-rotating rings around a square in the centre', pfad: 'flows along an endless track through the image',
    streuung: 'assembles from scattered letters and falls apart again', stapel: 'clicks into place word by word like a slot reel',
    schnitt: 'is cut into strips that slip against each other like a glitch', blende: 'is swept by a coloured shape that inverts the colours',
    pegel: 'swings letter by letter like an audio level meter',
  },
};
function sanitizeRegie(o) {
  if (!o || typeof o !== 'object' || !MODES[o.motion]) return null;
  const num = (v) => typeof v === 'number' ? v : parseFloat(v);
  const ok = (v) => Number.isFinite(num(v));
  const nearest = (v, arr) => arr.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
  const ov = { motion: o.motion };
  if (ok(o.angle)) ov.angle = nearest(num(o.angle), ANGLES);
  if (['left', 'center', 'right'].includes(o.align)) ov.align = o.align;
  if (ok(o.scale)) ov.scale = Math.round(clamp(num(o.scale), 0.7, 1.45) * 100) / 100;
  if (ok(o.weight)) ov.weight = nearest(num(o.weight), [400, 500, 600, 700]);
  if (STYLE_LBL[o.style]) ov.style = o.style;
  if (ok(o.tracking)) ov.tracking = nearest(num(o.tracking), TRACKS.map(x => x[0]));
  if (typeof o.upper === 'boolean') ov.upper = o.upper;
  if (o.font === 'grotesk' || o.font === 'mono') ov.font = o.font;
  if (TEX_LBL[o.texture]) ov.texture = o.texture;
  if (COLOR_LBL[o.color]) ov.color = o.color;
  if (ok(o.sub)) ov.sub = clamp(Math.round(num(o.sub)), 0, 2);
  if (ok(o.intensity)) ov.intensity = Math.round(clamp(num(o.intensity), 0.1, 1) * 100) / 100;
  if (ok(o.speed)) ov.speed = Math.round(clamp(num(o.speed), 0.5, 2) * 100) / 100;
  if (GRID_MOTIONS.includes(ov.motion) && GRID_TEXTURES.includes(ov.texture)) ov.texture = 'none';
  const text = typeof o.text === 'string' ? o.text.replace(/\s+/g, ' ').trim().slice(0, 30) : '';
  return { ov, text, titel: String(o.titel || MODES[o.motion].name).slice(0, 40), begruendung: String(o.begruendung || '').slice(0, 240) };
}
/* ---------- Typo engine API (kinetic typography) ---------- */
let memory = [];
function loopLength(e = effective()) { return MODES[e.motion].base / e.speed; }
function draw(R, p, e, wpal, L) {
  const T = loopLength(e);
  const mode = MODES[e.motion];
  let Rm = R, vis = { w: R.w, h: R.h };
  if (e.angle) {
    ctx.translate(R.x + R.w / 2, R.y + R.h / 2);
    ctx.rotate(e.angle * Math.PI / 180);
    if (Math.abs(e.angle) === 90) { Rm = { x: -R.h / 2, y: -R.w / 2, w: R.h, h: R.w }; vis = { w: R.h, h: R.w }; }
    else if (mode.fill) { const d = Math.hypot(R.w, R.h); Rm = { x: -d / 2, y: -d / 2, w: d, h: d }; vis = { w: R.w * 0.9, h: R.h * 0.9 }; }
    else { const w = R.w * 0.88, h = R.h * 0.88; Rm = { x: -w / 2, y: -h / 2, w, h }; vis = { w, h }; }
  }
  BASE = ctx.getTransform();
  const S = { pal: wpal, fam: e.font, size: e.scale, inten: e.intensity, txt: kineticText(e), T, weight: e.weight, style: e.style, track: e.tracking, align: e.align, sub: e.sub || 0, vis };
  mode.draw(Rm, p, S, L);
}
function summary(e) {
  const m = MODES[e.motion];
  return { kind: 'Typo', main: `${m.name} · ${m.subs[e.sub || 0]}`, tech: `${m.name} · ${m.subs[e.sub || 0]}`, reason: `Passt zu ${m.fits}` };
}
function altStatic(e, lang) {
  const txt = kineticText(e);
  return lang === 'en' ? `Graphic by digital age: the lettering "${txt}", ${ALT_COLOR.en[e.color]}.` : `Grafik von digital age: der Schriftzug «${txt}», ${ALT_COLOR.de[e.color]}.`;
}
function altAnimated(e, lang) {
  const txt = kineticText(e);
  return lang === 'en' ? `Graphic by digital age. The lettering "${txt}" ${ALT_MOTION.en[e.motion]}, ${ALT_COLOR.en[e.color]}.`
    : `Grafik von digital age. Der Schriftzug «${txt}» ${ALT_MOTION.de[e.motion]}, ${ALT_COLOR.de[e.color]}.`;
}
function options(e) {
  const m = MODES[e.motion];
  const pct = (v) => Math.round(v * 100) + ' %';
  return [
    { k: 'sub', label: 'Variante', type: 'chips', opts: m.subs.map((s, i) => [i, s]) },
    { k: 'angle', label: 'Neigung', type: 'chips', opts: [...new Set(m.angles)].map(a => [a, a === 0 ? 'Gerade' : Math.abs(a) === 90 ? 'Vertikal' : `${a > 0 ? '+' : '−'}${Math.abs(a)}°`]) },
    m.align ? { k: 'align', label: 'Ausrichtung', type: 'chips', opts: [['left', 'Links'], ['center', 'Mitte'], ['right', 'Rechts']] } : null,
    { k: 'style', label: 'Stil', type: 'chips', opts: Object.entries(STYLE_LBL) },
    { k: 'weight', label: 'Gewicht', type: 'chips', opts: Object.entries(WEIGHT_LBL).map(([k, v]) => [Number(k), v]) },
    { k: 'tracking', label: 'Laufweite', type: 'chips', opts: TRACKS.map(([v, l]) => [v, l]) },
    { k: 'upper', label: 'Schreibweise', type: 'chips', opts: [[true, 'Versalien'], [false, 'Wie geschrieben']] },
    { k: 'font', label: 'Schrift', type: 'chips', opts: [['grotesk', 'Grotesk'], ['mono', 'Mono']] },
    { k: 'texture', label: 'Textur', type: 'chips', opts: Object.entries(TEX_LBL) },
    { k: 'scale', label: 'Grösse', type: 'range', min: 0.7, max: 1.45, step: 0.01, fmt: pct },
    { k: 'intensity', label: 'Intensität', type: 'range', min: 0.1, max: 1, step: 0.01, fmt: pct },
    { k: 'speed', label: 'Tempo', type: 'range', min: 0.5, max: 2, step: 0.05, fmt: (v) => v.toFixed(2) + '×' },
  ].filter(Boolean);
}
function clearCaches() { decodeCache.clear(); maskCache.clear(); layoutCache.clear(); flapCache.clear(); pathCache.clear(); sliceCache.clear(); }
function motionList() {
  return Object.entries(MODES).map(([k, m]) => `- ${k} (${m.name}): ${m.desc}. Passt zu: ${m.fits}. sub: ${m.subs.map((s, i) => `${i} = ${s}`).join(', ')}`).join('\n');
}
return {
  id: 'typo', name: 'Typo', MODES, recipeFor, effective, fingerprint, similarity, checkFp, findVariant, loopLength, heroPhase,
  draw, summary, altStatic, altAnimated, options, sanitizeRegie, clearCaches, motionList,
  avoidKey: (e) => e.motion,
  setMemory: (m) => { memory = m; },
};

})();
/* ===== data (JSON, see data/) ===== */
const ICONS = Object.assign({}, icons);
const ICON_TAGS = Object.assign({}, iconTags);
const SCRIPT_FONT = scriptFont;
/* ===== line engine (motion/line/*.js + hero/line-api.js) ===== */
const LINE = (function () {
/* ---------- building blocks of a line variant ---------- */
const ANIMS = {
  zeichnen:  { name: 'Zeichnen',  base: 7, desc: 'Die Linie zeichnet das Motiv und verschwindet wieder' },
  lichtlauf: { name: 'Lichtlauf', base: 7, desc: 'Ein Lichtpunkt läuft die Linie entlang, dann leuchtet das ganze Motiv' },
  atmen:     { name: 'Atmen',     base: 6, desc: 'Das Motiv steht und bewegt sich leicht wie von Hand gezeichnet' },
  aufloesen: { name: 'Auflösen',  base: 8, desc: 'Die Linie zeichnet das Motiv und zerfällt in kleine Quadrate' },
  morph:     { name: 'Morph',     base: 9, desc: 'Die Linie zeichnet ein Motiv und verwandelt es ins nächste' },
  faden:     { name: 'Faden ziehen', base: 8, desc: 'Eine gerade Linie zieht sich zum Motiv zusammen und wird wieder zur Linie' },
  schreiben: { name: 'Schreibschrift', base: 10, desc: 'Der Stift zeichnet das Motiv und schreibt das Schlagwort darunter' },
  kamera:    { name: 'Kamerafahrt', base: 8, desc: 'Die Kamera folgt zuerst nah dem Stift und fährt dann zurück' },
  entwurf:   { name: 'Entwurf',   base: 9, desc: 'Hilfslinien wie auf einem Bauplan, dann zieht die Linie darüber' },
  zweistift: { name: 'Zwei Stifte', base: 7, desc: 'Zwei Stifte zeichnen von beiden Enden, bis sie sich in der Mitte treffen' },
};
// how often the dice choose each animation
const ANIM_PICK = [['zeichnen', 2], ['lichtlauf', 1], ['atmen', 0.8], ['aufloesen', 1], ['morph', 1.8], ['faden', 1.8], ['schreiben', 1.5], ['kamera', 1.3], ['zweistift', 1], ['entwurf', 0.8]].map(([id, w]) => ({ id, w }));
const STROKES = { feder: 'Feder', pinsel: 'Pinsel', doppel: 'Doppellinie', raster: 'Quadrate' };
const WEIGHTS = { fein: ['Fein', 0.0075], mittel: ['Mittel', 0.011], kraeftig: ['Kräftig', 0.016] };
const COMPS = { mitte: 'Mitte', gross: 'Gross', versetzt: 'Angeschnitten' };
const CAPTIONS = { unten: 'Darunter', keine: 'Keine', gross: 'Dahinter gross' };
const LINE_ANGLES = [-10, -6, 0, 6, 10];
const COLOR_LBL = Object.fromEntries(Object.entries(SCHEMES).map(([k, v]) => [k, v.name]));
const TEX_LBL = { none: 'Keine', dots: 'Punkte', lines: 'Linien', scan: 'Scan', signature: 'Signatur' };

/* ---------- motif library ---------- */
function signatureD(key) {
  const bits = sigBits(key);
  const cell = 18, o = 5, s = cell * 0.6, r = s * 0.3, h = s / 2;
  let d = '';
  for (let y = 0; y < 5; y++) {
    const xs = y % 2 ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4];
    for (const x of xs) {
      if (!bits[y][x]) continue;
      const cx = o + x * cell + cell / 2, cy = o + y * cell + cell / 2;
      d += `${d ? 'L' : 'M'} ${cx} ${cy - h} L ${cx + h - r} ${cy - h} Q ${cx + h} ${cy - h} ${cx + h} ${cy - h + r} L ${cx + h} ${cy + h - r} Q ${cx + h} ${cy + h} ${cx + h - r} ${cy + h} `;
      d += `L ${cx - h + r} ${cy + h} Q ${cx - h} ${cy + h} ${cx - h} ${cy + h - r} L ${cx - h} ${cy - h + r} Q ${cx - h} ${cy - h} ${cx - h + r} ${cy - h} L ${cx} ${cy - h} `;
    }
  }
  return d;
}
function genHarmonograph(rnd) {
  const ratios = [[2, 3], [3, 4], [3, 5], [4, 5], [1, 2], [2, 5], [5, 6]];
  const [a, b] = ratios[Math.floor(rnd() * ratios.length)];
  const det = 0.008 + rnd() * 0.02, damp = 0.045 + rnd() * 0.03;
  const ph = [rnd(), rnd(), rnd(), rnd()].map(x => x * TAU);
  const pts = [], T = 14, n = 2000;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) * T, e = Math.exp(-damp * t);
    pts.push([(Math.sin(a * t + ph[0]) + 0.45 * Math.sin((b + det) * t + ph[1])) * e, (Math.sin(b * t + ph[2]) + 0.45 * Math.sin((a + det) * t + ph[3])) * e]);
  }
  return { pts };
}
function genRosette(rnd) {
  const opts = [[5, 2], [7, 3], [8, 3], [7, 2], [9, 4], [5, 3], [9, 2], [7, 4]];
  const [R, r] = opts[Math.floor(rnd() * opts.length)];
  const g = (x, y) => y ? g(y, x % y) : x;
  const dd = r * (0.55 + rnd() * 0.75), T = TAU * r / g(R, r), n = 2600, k = (R - r) / r;
  const pts = [];
  for (let i = 0; i < n; i++) { const t = i / (n - 1) * T; pts.push([(R - r) * Math.cos(t) + dd * Math.cos(k * t), (R - r) * Math.sin(t) - dd * Math.sin(k * t)]); }
  return { pts };
}
/* Concrete motifs are Lucide symbols (ISC licence), joined into one line by the engine. Keys: "~" = weak hint, "=" = whole word only */
/* Own symbols in the Lucide style, where the Lucide original loses its meaning when drawn large */
Object.assign(ICONS, {
  'robot': 'M7 9h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z|M12 9V5.5|M10.5 4a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0|M7.5 13.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0|M13.5 13.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0|M9.5 17h5|M4 13H2.5v3H4|M20 13h1.5v3H20',
  'coins-rim': 'M13.744 17.736a6 6 0 1 1-7.48-7.48|M10 8a6 6 0 1 0 12 0a6 6 0 1 0 -12 0|M12.4 8a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0|M11.446 17.04A3.6 3.6 0 1 1 6.96 12.554',
  'coins-franc': 'M13.744 17.736a6 6 0 1 1-7.48-7.48|M10 8a6 6 0 1 0 12 0a6 6 0 1 0 -12 0|M15 11V5h3|M15 8h2.5|M13.8 9.6h3',
  // the digital age bot: head, headphones, eyebrows; "!" marks the visor, drawn in the signal colour
  'digital-age-bot': 'M1.81 11.5A10.3 10.3 0 0 1 22.19 11.5|M22.17 14.65A10.3 10.3 0 0 1 1.83 14.65|M1.1 11A10.92 10.92 0 0 1 22.9 11|M1.8 11H1.1a0.7 0.7 0 0 0-0.7 0.7v2.8a0.7 0.7 0 0 0 0.7 0.7H1.8|M22.2 11h0.7a0.7 0.7 0 0 1 0.7 0.7v2.8a0.7 0.7 0 0 1-0.7 0.7H22.2|!M1.8 11.5H22.2V14.65H1.8Z|M9 8.7L5.2 9A0.75 0.75 0 0 0 5.3 10.5L9 10.35Z|M15 8.7L18.8 9A0.75 0.75 0 0 1 18.7 10.5L15 10.35Z',
});
Object.assign(ICON_TAGS, { 'digital-age-bot': 'digital age bot digitalage maskottchen mascot signatur signature', 'robot': 'robot bot ai agent android machine', 'coins-rim': 'coins coin money cash finance', 'coins-franc': 'coins coin franc swiss chf money currency' });
const OWN_ICONS = new Set(['digital-age-bot', 'robot', 'coins-rim', 'coins-franc']);
const mk = (id, name, icon, de, en, keys, hand) => ({ id, name, icon, alt: { de, en }, keys, hand: !!hand });
const MOTIFS = [
  mk('dabot', 'digital age Bot', 'digital-age-bot', 'den digital age Bot mit Kopfhörern und grünem Visier', 'the digital age bot with headphones and a green visor', 'digitalage redaktion jubilaeum community leser leserinnen umfrage maskottchen'),
  mk('gehirn', 'Gehirn', 'brain', 'ein Gehirn', 'a brain', 'ki~ ai~ intelligenz intelligence llm llms modell~ model~ gpt claude chatgpt gemini denken reasoning kognitiv'),
  mk('gehirn-netz', 'Gehirn mit Schaltkreis', 'brain-circuit', 'ein Gehirn mit Schaltkreis', 'a brain with a circuit', 'neuronal neural lernen learning training deeplearning maschinell ml= ki~ ai~'),
  mk('roboter', 'Roboter', 'robot', 'einen Roboterkopf mit Antenne', 'a robot head with an antenna', 'agent agenten agents agentic roboter robot robots robotik bot= bots assistent assistant autonom autonomous'),
  mk('funken', 'Funken', 'sparkles', 'funkelnde Sterne', 'sparkles', 'generativ generative genai copilot magie magic'),
  mk('gluehbirne', 'Glühbirne', 'lightbulb', 'eine Glühbirne', 'a light bulb', 'idee ideen idea ideas innovation innovativ erfindung kreativ kreativitaet'),
  mk('rakete', 'Rakete', 'rocket', 'eine Rakete', 'a rocket', 'startup startups gruender gruenderin gruenden launch skalierung scaleup seed finanzierungsrunde venture wagniskapital'),
  mk('teleskop', 'Teleskop', 'telescope', 'ein Teleskop', 'a telescope', 'vision visionen ausblick zukunft~ future~ prognosen'),
  mk('bank', 'Bank', 'landmark', 'ein Bankgebäude mit Säulen', 'a bank building with columns', 'bank banking banken banks bankwesen kantonalbank privatbank privatbanken finma~'),
  mk('sparschwein', 'Sparschwein', 'piggy-bank', 'ein Sparschwein', 'a piggy bank', 'sparen sparkonto vorsorge pension pensionskasse rente savings altersvorsorge'),
  mk('muenze', 'Münzen', 'coins-rim', 'zwei Münzen', 'two coins', 'geld money finanz finance fintech invest kapital kosten preis preise budget umsatz waehrung currency'),
  mk('franken', 'Franken', 'coins-franc', 'zwei Münzen mit Franken-Zeichen', 'two coins with a franc sign', 'franken chf snb nationalbank rappen'),
  mk('dollar', 'Dollar', 'circle-dollar-sign', 'eine Dollar-Münze', 'a dollar coin', 'dollar dollars usd'),
  mk('geldhand', 'Hand mit Münzen', 'hand-coins', 'eine Hand mit Münzen', 'a hand holding coins', 'zahlung zahlungen payment payments bezahl bezahlen pay= paying transaktion transaktionen transaction transactions ueberweisung'),
  mk('bitcoin', 'Bitcoin', 'bitcoin', 'das Bitcoin-Zeichen', 'the bitcoin sign', 'krypto crypto bitcoin blockchain token tokens stablecoin web3'),
  mk('kurve', 'Kurve', 'trending-up', 'eine steigende Kurve', 'a rising chart line', 'wachstum growth markt~ market~ statistik prognose forecast trend trends boerse aktie aktien stock rendite ipo= bewertung'),
  mk('koffer', 'Aktenkoffer', 'briefcase', 'einen Aktenkoffer', 'a briefcase', 'business unternehmen firma firmen kmu wirtschaft karriere'),
  mk('haendedruck', 'Händedruck', 'handshake', 'einen Händedruck', 'a handshake', 'partnerschaft partnership kooperation deal= deals uebernahme acquisition fusion merger vertrag zusammenarbeit'),
  mk('ziel', 'Zielscheibe', 'target', 'eine Zielscheibe', 'a target', 'strategie strategy ziel= ziele fokus marketing kampagne'),
  mk('pokal', 'Pokal', 'trophy', 'einen Pokal', 'a trophy', 'award awards gewinner gewinnerin sieger wettbewerb ranking champion'),
  mk('personen', 'Personen', 'users', 'zwei Personen', 'two people', 'team= teams mitarbeitende arbeitnehmer jobs arbeit= arbeitsmarkt arbeitswelt arbeitsplatz arbeitsplaetze fachkraefte talent talente personal= menschen gesellschaft'),
  mk('schluessel', 'Schlüssel', 'key-round', 'einen Schlüssel', 'a key', 'zugang zugriff access schluessel key= login identitaet identity authentifizierung passkey'),
  mk('schloss', 'Schloss', 'lock-keyhole', 'ein Vorhängeschloss', 'a padlock', 'datenschutz privacy verschluesselung encrypt encryption passwort password geheim vertraulich dsgvo gdpr'),
  mk('schild', 'Schild', 'shield-check', 'einen Schild mit Häkchen', 'a shield with a check mark', 'sicherheit security schutz protect cyber cybersecurity risiko risiken risk compliance aufsicht regulierung regulation'),
  mk('waage', 'Waage', 'scale', 'eine Waage', 'a pair of scales', 'recht= rechte rechtlich rechtliche gesetz gesetze justiz gericht= gerichte urteil ethik ethics fair fairness legal klage anwalt act='),
  mk('bug', 'Käfer', 'bug', 'einen Käfer', 'a bug', 'bug= bugs fehler hacker hack hacking malware virus sicherheitsluecke'),
  mk('gesicht', 'Gesichtserkennung', 'scan-face', 'ein gescanntes Gesicht', 'a scanned face', 'gesichtserkennung biometrie biometrisch face= faces'),
  mk('auge', 'Auge', 'eye', 'ein Auge', 'an eye', 'ueberwachung surveillance sehen deepfake deepfakes transparenz transparency'),
  mk('chip', 'Chip', 'cpu', 'einen Computerchip', 'a computer chip', 'chip chips halbleiter semiconductor semiconductors hardware prozessor processor gpu gpus nvidia rechenleistung compute'),
  mk('code', 'Code', 'code-xml', 'spitze Code-Klammern', 'code brackets', 'code coding programmieren software entwickler developer developers github opensource'),
  mk('datenbank', 'Datenbank', 'database', 'eine Datenbank', 'a database', 'daten= data= datenbank database datensatz datensaetze datenmenge datenmengen bigdata analytics'),
  mk('netzwerk', 'Netzwerk', 'network', 'ein Netzwerk', 'a network', 'netz netzwerk network vernetzung vernetzt iot plattform platform oekosystem ecosystem schnittstelle api interoperabilitaet connect'),
  mk('wolke', 'Wolke', 'cloud-upload', 'eine Wolke mit Pfeil nach oben', 'a cloud with an upward arrow', 'cloud hosting rechenzentrum rechenzentren datacenter saas server'),
  mk('smartphone', 'Smartphone', 'smartphone', 'ein Smartphone', 'a smartphone', 'app= apps smartphone smartphones mobile handy iphone android'),
  mk('wifi', 'WLAN', 'wifi', 'ein WLAN-Symbol', 'a wifi symbol', 'internet wlan wifi konnektivitaet 5g'),
  mk('zahnrad', 'Zahnrad', 'settings', 'ein Zahnrad', 'a gear', 'prozess prozesse process automatisierung automation workflow workflows effizienz efficiency'),
  mk('fabrik', 'Fabrik', 'factory', 'eine Fabrik', 'a factory', 'industrie industry produktion fertigung manufacturing fabrik maschinen'),
  mk('puzzle', 'Puzzle', 'puzzle', 'ein Puzzleteil', 'a puzzle piece', 'integration loesung loesungen problem'),
  mk('sprechblase', 'Sprechblase', 'message-circle', 'eine Sprechblase', 'a speech bubble', 'chat chatbot chatbots sprache language gespraech kommunikation dialog conversation prompt prompts'),
  mk('mikrofon', 'Mikrofon', 'mic', 'ein Mikrofon', 'a microphone', 'podcast podcasts interview stimme voice audio sprachassistent'),
  mk('zeitung', 'Zeitung', 'newspaper', 'eine Zeitung', 'a newspaper', 'news medien media journalismus journalism zeitung zeitungen verlag verlage newsletter'),
  mk('mail', 'Brief', 'mail', 'einen Briefumschlag', 'an envelope', 'email mail= mails post= inbox'),
  mk('kamera', 'Kamera', 'camera', 'eine Kamera', 'a camera', 'kamera camera kameras foto fotos bild= bilder bildgenerierung image images'),
  mk('film', 'Filmklappe', 'clapperboard', 'eine Filmklappe', 'a clapperboard', 'video videos film filme kino streaming'),
  mk('palette', 'Farbpalette', 'palette', 'eine Farbpalette', 'a colour palette', 'design designer kunst art= grafik'),
  mk('stift', 'Stift', 'pen-line', 'einen Stift', 'a pen', 'schreiben writing texte autor copywriting'),
  mk('spiel', 'Gamepad', 'gamepad-2', 'ein Gamepad', 'a gamepad', 'gaming games spiele= videospiele'),
  mk('globus', 'Globus', 'globe', 'einen Globus', 'a globe', 'global globale globalisierung welt= weltweit weltwirtschaft world international eu= europa europe usa= china geopolitik'),
  mk('berg', 'Berg', 'mountain-snow', 'einen Berg mit Schnee', 'a snowy mountain', 'schweiz swiss schweizer zuerich zurich genf geneva bern= basel alpen'),
  mk('blatt', 'Blatt', 'leaf', 'ein Blatt', 'a leaf', 'nachhaltigkeit nachhaltig sustainability klima climate umwelt co2 green emissionen'),
  mk('blitz', 'Blitz', 'zap', 'einen Blitz', 'a lightning bolt', 'energie energy strom schnell fast= power disruption disruptiv tempo'),
  mk('lupe', 'Lupe', 'search', 'eine Lupe', 'a magnifying glass', 'suche search analyse analysis studie study studien pruefung audit recherche'),
  mk('mikroskop', 'Mikroskop', 'microscope', 'ein Mikroskop', 'a microscope', 'forschung research wissenschaft science labor forscher forschende'),
  mk('atom', 'Atom', 'atom', 'ein Atom', 'an atom', 'quanten quantum physik qubit qubits'),
  mk('dna', 'DNA', 'dna', 'einen DNA-Strang', 'a DNA strand', 'biotech genetik genom pharma lifescience', true),
  mk('herz', 'Herz', 'heart-pulse', 'ein Herz mit Herzschlaglinie', 'a heart with a heartbeat line', 'gesundheit health medizin medical spital hospital patient patienten pflege arzt aerzte diagnose'),
  mk('bildung', 'Doktorhut', 'graduation-cap', 'einen Doktorhut', 'a graduation cap', 'bildung education schule schulen school universitaet university hochschule eth= epfl studium studierende ausbildung weiterbildung'),
  mk('buch', 'Buch', 'book-open', 'ein offenes Buch', 'an open book', 'buch buecher book books wissen= bibliothek lesen'),
  mk('auto', 'Auto', 'car', 'ein Auto', 'a car', 'auto= autos mobilitaet mobility fahrzeug fahrzeuge selbstfahrend tesla verkehr'),
  mk('flugzeug', 'Flugzeug', 'plane', 'ein Flugzeug', 'a plane', 'reisen travel luftfahrt aviation flughafen tourismus'),
  mk('lkw', 'Lastwagen', 'truck', 'einen Lastwagen', 'a truck', 'logistik logistics lieferkette lieferketten supply transport'),
  mk('wagen', 'Einkaufswagen', 'shopping-cart', 'einen Einkaufswagen', 'a shopping cart', 'handel= einzelhandel onlinehandel retail ecommerce shop shopping einkauf konsum konsumenten kunden'),
  mk('haus', 'Haus', 'house', 'ein Haus', 'a house', 'immobilien immobilie wohnen smarthome miete'),
  mk('uhr', 'Uhr', 'clock', 'eine Uhr', 'a clock', 'zeit= produktivitaet stunden'),
  mk('satellit', 'Satellit', 'satellite', 'einen Satelliten', 'a satellite', 'raumfahrt weltraum space satellit satelliten orbit', true),
  { id: 'abs-harmo', name: 'Schwingung', abstract: true, alt: { de: 'eine abstrakte Schwingungsfigur', en: 'an abstract oscillating figure' }, keys: '', gen: genHarmonograph },
  { id: 'abs-rosette', name: 'Rosette', abstract: true, alt: { de: 'eine geometrische Rosette', en: 'a geometric rosette' }, keys: '', gen: genRosette },
  { id: 'abs-signatur', name: 'Signaturlinie', abstract: true, alt: { de: 'die Signatur des Artikels aus abgerundeten Quadraten', en: 'the article signature made of rounded squares' }, keys: '', gen: (rnd, key) => ({ d: signatureD(key) }) },
];
const MOTIF_BY_ID = Object.fromEntries(MOTIFS.map(m => [m.id, m]));
const ICON_DE = Object.fromEntries(MOTIFS.filter(m => m.icon).map(m => [m.icon, m.name]));
const ICON_MOTIF = Object.fromEntries(MOTIFS.filter(m => m.icon).map(m => [m.icon, m.id]));
let iconTitles = {};  // German titles Claude gave to symbols it picked
function iconLabel(name) { return name.split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' '); }
const RUBRIK_MOTIF = { 'Swiss AI': ['berg', 1.5], 'Tools': ['zahnrad', 0.6], 'Podcast': ['mikrofon', 0.8], 'Future Tech': ['rakete', 0.4] };
// without a matching keyword: first the symbol tags (English), then a motif for the rubric
const RUBRIK_FALLBACK = {
  'KI & Business': ['gehirn', 'kurve', 'koffer'], 'Future Tech': ['rakete', 'gluehbirne', 'teleskop'], 'Swiss AI': ['berg', 'gehirn-netz', 'gluehbirne'],
  'Tools': ['zahnrad', 'code', 'puzzle'], 'Podcast': ['mikrofon', 'sprechblase'], 'Newsletter': ['dabot', 'zeitung', 'mail'], 'Spotlight': ['gluehbirne', 'lupe'],
};
/* symbol search: German motif names/keys, Lucide names and Lucide tags */
const STOP = new Set('about after again against also among because before being between could does doing during each from further have having here into itself just more most other over same should some such than that their theirs them then there these they this those through under until very what when where which while will with would your yours ueber unter einer einem einen eines dieser diese dieses wird werden wurde wurden haben hatte nicht schon noch mehr auch sich sind seine ihre ihren warum wieso darum heute immer alle allen viele vielen neue neuen neues kann koennen muss muessen soll sollen wenn aber oder sowie zwischen gegen durch ohne beim'.split(' '));
/* German -> English, so German words also find the 1600 Lucide symbols (whose tags are English) */
const DE_EN = Object.fromEntries(('kaffee:coffee tee:tea bier:beer wein:wine getraenk:cup essen:food pizza:pizza apfel:apple banane:banana brot:sandwich kuchen:cake torte:cake '
  + 'karotte:carrot kirsche:cherry traube:grape zitrone:citrus fisch:fish fleisch:beef milch:milk salat:salad suppe:soup burger:hamburger popcorn:popcorn bonbon:candy '
  + 'suessigkeiten:candy koch:chef kochen:chef keks:cookie hund:dog katze:cat vogel:bird pferd:horse kaninchen:rabbit hase:rabbit schildkroete:turtle schnecke:snail '
  + 'eichhoernchen:squirrel panda:panda ratte:rat schlange:snake wurm:worm tier:paw tiere:paw haustier:paw pfote:paw baum:tree wald:forest blume:flower pflanze:plant '
  + 'sonne:sun mond:moon stern:star sterne:star wolke:cloud regen:rain schnee:snow wind:wind sturm:storm feuer:flame flamme:flame wasser:droplet tropfen:droplet meer:waves '
  + 'welle:waves wellen:waves insel:island regenschirm:umbrella erde:earth planet:planet regenbogen:rainbow temperatur:thermometer kaelte:snowflake zug:train bahn:train '
  + 'eisenbahn:train bus:bus fahrrad:bike velo:bike schiff:ship boot:sailboat segeln:sailboat taxi:taxi motorrad:motorbike roller:scooter drohne:drone drohnen:drone '
  + 'landkarte:map navigation:navigation kompass:compass parkplatz:parking tankstelle:fuel benzin:fuel ladestation:plug gebaeude:building buero:building kirche:church '
  + 'krankenhaus:hospital hotel:hotel laden:store geschaeft:store burg:castle bruecke:bridge zelt:tent tuer:door mauer:brick werkzeug:wrench hammer:hammer '
  + 'schraubenzieher:screwdriver schere:scissors pinsel:brush farbe:paint lineal:ruler kette:link magnet:magnet taschenlampe:flashlight lampe:lamp batterie:battery '
  + 'akku:battery stecker:plug kabel:cable besen:broom axt:axe schaufel:shovel anker:anchor dokument:file dokumente:file datei:file dateien:file ordner:folder paket:package '
  + 'pakete:package kiste:box kalender:calendar termin:calendar wecker:alarm notiz:notebook notizen:notebook heft:notebook bleistift:pencil drucker:printer tastatur:keyboard '
  + 'maus:mouse bildschirm:monitor laptop:laptop computer:computer rechner:computer tablet:tablet telefon:phone anruf:phone foto:image fotos:image musik:music '
  + 'kopfhoerer:headphones lautsprecher:speaker radio:radio fernseher:tv fernsehen:tv archiv:archive praesentation:presentation diagramm:chart tabelle:table liste:list '
  + 'flagge:flag fahne:flag stecknadel:pin geschenk:gift geschenke:gift rabatt:percent prozent:percent rechnung:receipt quittung:receipt kreditkarte:credit '
  + 'geldboerse:wallet portemonnaie:wallet brieftasche:wallet tresor:vault wuerfel:dice spiel:gamepad ball:volleyball medaille:medal krone:crown diamant:gem edelstein:gem '
  + 'nachricht:message nachrichten:message glocke:bell benachrichtigung:bell sirene:siren alarm:siren megafon:megaphone antenne:antenna signal:signal teilen:share '
  + 'herunterladen:download download:download hochladen:upload filter:filter einstellungen:settings fingerabdruck:fingerprint laecheln:smile ohr:ear hand:hand daumen:thumbs '
  + 'knochen:bone pille:pill medikament:pill medikamente:pill spritze:syringe impfung:syringe impfstoff:syringe pflaster:bandage rollstuhl:accessibility baby:baby '
  + 'familie:users gruppe:users tempo:gauge geschwindigkeit:gauge verbot:ban party:party feier:party geburtstag:cake reise:luggage koffer:luggage urlaub:luggage '
  + 'glueck:clover kleeblatt:clover zufall:dice unendlich:infinity muell:trash abfall:trash prozessor:cpu festplatte:database speicher:database programm:code '
  + 'schaltkreis:circuit platine:circuit labor:flask chemie:flask experiment:flask brille:glasses baustein:blocks bausteine:blocks hantel:dumbbell fitness:dumbbell '
  + 'bett:bed schlaf:bed schlafen:bed sofa:sofa sessel:armchair stuhl:armchair').split(' ').map(x => x.split(':')));
// German label for a symbol whose name is a plain English word (coffee -> Kaffee); skipped where umlauts would be lost
const EN_DE = {};
for (const [de, en] of Object.entries(DE_EN)) if (!EN_DE[en] && !/ae|oe|ue/.test(de)) EN_DE[en] = de[0].toUpperCase() + de.slice(1);
function deToEn(w) {
  if (DE_EN[w]) return DE_EN[w];
  for (const suf of ['en', 'er', 'n', 'e', 's']) if (w.length > suf.length + 3 && w.endsWith(suf) && DE_EN[w.slice(0, -suf.length)]) return DE_EN[w.slice(0, -suf.length)];
  return null;
}
let tagIndex = null;
function iconTagIndex() {
  if (tagIndex) return tagIndex;
  tagIndex = new Map();
  for (const [name, tg] of Object.entries(ICON_TAGS)) {
    for (const w of new Set((tg + ' ' + name.replace(/-/g, ' ')).split(' '))) {
      if (w.length < 4) continue;
      if (!tagIndex.has(w)) tagIndex.set(w, []);
      tagIndex.get(w).push(name);
    }
  }
  return tagIndex;
}
function searchIcons(q, limit = 24) {
  const raw = normWord(q).split(/[^a-z0-9]+/).filter(w => w.length >= 2);
  const words = [...new Set(raw.flatMap(w => { const en = deToEn(w); return en ? [w, en] : [w]; }))];
  if (!words.length) return [];
  const score = new Map();
  const add = (name, v) => { if (ICONS[name]) score.set(name, (score.get(name) || 0) + v); };
  for (const w of words) {
    for (const m of MOTIFS) if (m.icon) {
      if (normWord(m.name).includes(w)) add(m.icon, 9);
      else if (parseKeys(m.keys).some(({ k }) => k === w || (w.length >= 4 && k.startsWith(w)))) add(m.icon, 6);
    }
    for (const name of Object.keys(ICONS)) {
      if (name === w) add(name, 10);
      else if (name.split('-').includes(w)) add(name, 5);
      else if (w.length >= 3 && name.includes(w)) add(name, 2);
    }
    const idx = iconTagIndex();
    if (idx.has(w)) for (const name of idx.get(w)) add(name, 3);
    else if (w.length >= 4) for (const [tg, names] of idx) if (tg.startsWith(w)) for (const name of names) add(name, 1);
  }
  // variants like "-off", "-x" or "-plus" only when asked for
  for (const [name, v] of score) if (/-(off|x|plus|minus|check|alert|question|dashed|slash)$/.test(name) && !words.some(w => name.endsWith('-' + w))) score.set(name, v - 3);
  return [...score].filter(x => x[1] > 0).sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).slice(0, limit).map(x => x[0]);
}
function iconMotifId(name) { return ICON_MOTIF[name] || 'icon:' + name; }
let libList = [];     // team library: KI motifs saved with keywords
let ratingMap = {};   // motif id -> { votes: { viewerId: 1 | -1 | 0 } }
function ratingScore(id) {
  const v = ratingMap[id] && ratingMap[id].votes;
  return v ? Object.values(v).reduce((a, x) => a + (x > 0 ? 1 : x < 0 ? -1 : 0), 0) : 0;
}
function normWord(s) { return (s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'); }
function parseKeys(str) { return String(str || '').split(/[\s,]+/).filter(Boolean).map(normWord).map(k => ({ k: k.replace(/[~=]/g, ''), w: k.endsWith('~') ? 0.4 : 1, exact: k.endsWith('=') })).filter(x => x.k); }
const MOTIF_KEYS = MOTIFS.filter(m => m.keys).map(m => ({ id: m.id, keys: parseKeys(m.keys) }));
function motifCandidates() {
  const joined = normWord([state.headline, state.text, state.postNotes].join(' '));
  const words = joined.split(/[^a-z0-9]+/).filter(Boolean);
  if (/digital[\s-]?age/.test(joined)) words.push('digitalage');   // "digital age" in the text: the house bot
  const scored = [];
  const keyed = MOTIF_KEYS.concat(libList.map(l => ({ id: l.id, keys: parseKeys(l.keys) })));
  const rb = RUBRIK_MOTIF[state.rubrik];
  for (const m of keyed) {
    const r = ratingScore(m.id);
    if (r <= -2 || (MOTIF_BY_ID[m.id] && MOTIF_BY_ID[m.id].hand)) continue;
    let score = 0, strong = null, weak = null;
    for (const w of words) {
      const hitKey = m.keys.find(({ k, exact }) => exact || k.length <= 3 ? w === k : w.startsWith(k));   // one match per word
      if (!hitKey) continue;
      score += hitKey.w;
      if (hitKey.w >= 1) strong = strong || w; else weak = weak || w;
    }
    if (rb && rb[0] === m.id && score > 0) score += rb[1];
    if (score > 0) scored.push({ id: m.id, score: score * clamp(1 + 0.3 * r, 0.3, 2.2), hit: strong || weak });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  if (top.length) return top.map((c, i) => ({ id: c.id, w: [6, 4, 3][i], hit: c.hit }));
  // English headlines: match the Lucide tags (specific tags count more than broad ones)
  const idx = iconTagIndex(), tagScore = new Map(), tagHit = new Map();
  const variant = /-(off|x|plus|minus|check|alert|question|dashed|slash|cog|search|pen|star|heart|lock|up|down)$/;
  for (const w0 of new Set(words)) {
    const w = ICONS[w0] || idx.has(w0) ? w0 : (deToEn(w0) || w0);   // English words stay English (listen is not Liste)
    if (w.length < 3 || STOP.has(w)) continue;
    if (ICONS[w] && (w.length >= 4 || w !== w0)) { tagScore.set(w, (tagScore.get(w) || 0) + 2); tagHit.set(w, w0); }   // the word is a symbol name: strongest hint
    if (w.length < 5 || !idx.has(w)) continue;
    const names = idx.get(w).filter(nm => !variant.test(nm));
    if (!names.length || names.length > 40) continue;
    for (const nm of names) { tagScore.set(nm, (tagScore.get(nm) || 0) + 0.6 / Math.sqrt(names.length)); if (!tagHit.has(nm)) tagHit.set(nm, w0); }
  }
  const tagTop = [...tagScore].map(([nm, v]) => ({ id: iconMotifId(nm), v, hit: tagHit.get(nm) })).filter(c => ratingScore(c.id) > -2)
    .sort((a, b) => b.v - a.v).filter((c, i, arr) => c.v >= arr[0].v * 0.5).slice(0, 3);
  if (tagTop.length) return tagTop.map(c => ({ id: c.id, w: Math.max(0.5, c.v * 3), hit: c.hit, tag: true }));
  const fb = (RUBRIK_FALLBACK[state.rubrik] || ['gehirn', 'gluehbirne']).filter(id => ratingScore(id) > -2);
  const list = fb.length ? fb : ['gluehbirne'];
  return list.map((id, i) => ({ id, w: [3, 2, 1][i] || 1, hit: null, fallback: true }));
}
function weightedPick(list, rnd) {
  const total = list.reduce((a, c) => a + c.w, 0);
  let x = rnd() * total;
  for (const c of list) { x -= c.w; if (x <= 0) return c.id; }
  return list[list.length - 1].id;
}
function recipeFor(key, variant) {
  const rnd = mulberry32(strHash(key + '#' + variant));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const cands = motifCandidates();
  const motif = weightedPick(cands, rnd);
  const others = cands.filter(c => c.id !== motif);
  const motif2 = others.length ? weightedPick(others, rnd) : null;
  let anim = weightedPick(ANIM_PICK, rnd);
  if (anim === 'morph' && !motif2) anim = 'zeichnen';
  const wt = writeText();
  if (anim === 'schreiben' && !(wt.length >= 2 && wt.length <= 26)) anim = 'faden';   // handwriting needs a short keyword
  return {
    motif, motif2, anim,
    stroke: pick(['feder', 'feder', 'pinsel', 'doppel', 'raster']),
    weight: pick(['fein', 'mittel', 'mittel', 'kraeftig']),
    comp: pick(['mitte', 'mitte', 'gross', 'versetzt']),
    angle: pick([0, 0, 0, -6, 6, -10, 10]),
    caption: pick(['unten', 'unten', 'keine', 'gross']),
    texture: pick(['none', 'none', 'none', 'dots', 'lines', 'scan']),
    color: pickScheme(rnd),
    wobble: Math.round((0.15 + rnd() * 0.35) * 100) / 100,
    align: pick(['left', 'right']),
    scale: Math.round((0.92 + rnd() * 0.16) * 100) / 100,
    upper: true,
    jitter: 0.88 + rnd() * 0.24,
  };
}
function baseSpeed() {
  const r = Number(state.readMin);
  if (!r || r < 1) return 1;
  return clamp(1.22 - (r - 3) * 0.045, 0.75, 1.3); // short reads move faster, long reads calmer
}
function effective() {
  const rec = recipeFor(articleKey(), state.variant);
  const ov = state.overrides || {};
  const pin = state.pinned || {};
  const e = Object.assign({}, rec, ov);
  // a saved visual keeps its motif even if ratings or the library change the automatic choice later
  if (!ov.motif && pin.motif && motifInfo(pin.motif)) e.motif = pin.motif;
  if (!ov.motif2 && pin.motif2 && motifInfo(pin.motif2)) e.motif2 = pin.motif2;
  if (!ov.anim && pin.anim && ANIMS[pin.anim]) e.anim = pin.anim;
  if (!SCHEMES[e.color]) e.color = 'gruen';
  if (!motifInfo(e.motif)) e.motif = rec.motif;
  if (!ANIMS[e.anim]) e.anim = rec.anim;
  if (!e.motif2 || e.motif2 === e.motif || !motifInfo(e.motif2)) {
    const alt = motifCandidates().map(c => c.id).find(id => id !== e.motif) || MOTIFS.find(m => !m.abstract && m.id !== e.motif).id;
    e.motif2 = alt;
  }
  if (e.anim === 'schreiben' && writeText()) e.caption = 'keine';   // the pen writes the keyword itself
  e.speed = ov.speed || Math.round(baseSpeed() * rec.jitter * 100) / 100;
  return e;
}

/* ---------- fingerprint + memory rule ---------- */
const FP_W = { motif: 3, anim: 2, color: 2, hue: 1, stroke: 1.5, comp: 1, motif2: 1, caption: 0.8, texture: 0.8, weight: 0.5 };
function fingerprint(e) {
  return { motif: e.motif, motif2: e.anim === 'morph' ? e.motif2 : '-', anim: e.anim, stroke: e.stroke, weight: e.weight, comp: e.comp, caption: e.caption, texture: e.texture, color: e.color, hue: (SCHEMES[e.color] || {}).hue || '?' };
}
function similarity(a, b) {
  let s = 0, t = 0;
  for (const k in FP_W) { t += FP_W[k]; if (a && b && a[k] === b[k]) s += FP_W[k]; }
  return s / t;
}
function recentOthers(key) {
  return memory.filter(m => m.key !== key).sort((a, b) => (b.savedAtMs || 0) - (a.savedAtMs || 0)).slice(0, 10);
}
function checkFp(fp, key) {
  const recent = recentOthers(key);
  let closest = null;
  for (const m of recent) { const sim = similarity(fp, m.fp); if (!closest || sim > closest.sim) closest = { entry: m, sim }; }
  const sameMotif = !String(fp.motif).startsWith('ki-') && recent.slice(0, 2).find(m => m.fp && m.fp.motif === fp.motif);
  if (sameMotif) return { ok: false, closest, reason: 'motif', hit: sameMotif };
  if (closest && closest.sim >= 0.6) return { ok: false, closest, reason: 'similar', hit: closest.entry };
  return { ok: true, closest, count: recent.length };
}
function variantPasses(key, v) { return checkFp(fingerprint(recipeFor(key, v)), key).ok; }
function findVariant(key, start, dir, avoid = []) {
  for (let i = 0; i < 400; i++) {
    const v = start + i * dir;
    if (v < 0) break;
    const fp = fingerprint(recipeFor(key, v));
    if (avoid.some(a => similarity(a, fp) >= 0.7)) continue;
    if (checkFp(fp, key).ok) return v;
  }
  return Math.max(0, start);
}
/* ---------- line engine: one continuous line, sampled evenly, drawn like a pen ---------- */
const easeIO = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const N_PTS = 1000;
const svgSampler = (() => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;left:-9999px';
  const path = document.createElementNS(ns, 'path');
  svg.append(path);
  document.body.append(svg);
  return path;
})();

/* Split drawings into their strokes (sub-paths). Tiny strokes (dots, e.g. eyes) become small loops. */
function subpathsOf(d, unit) {
  const out = [];
  try {
    svgSampler.setAttribute('d', d);
    const len = svgSampler.getTotalLength();
    if (!isFinite(len)) return out;
    if (len < unit * 0.6) {
      const r = unit * 0.9;
      for (const mm of d.matchAll(/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g)) {
        const x = parseFloat(mm[1]), y = parseFloat(mm[2]);
        out.push(Array.from({ length: 25 }, (_, k) => [x + r * Math.sin(k / 24 * TAU), y - r * Math.cos(k / 24 * TAU)]));
      }
      return out;
    }
    const step = unit * 0.12, n = Math.max(16, Math.ceil(len / step));
    let cur = [], prev = null;
    for (let i = 0; i <= n; i++) {
      const q = svgSampler.getPointAtLength(len * i / n);
      if (!isFinite(q.x) || !isFinite(q.y)) continue;
      if (prev && Math.hypot(q.x - prev.x, q.y - prev.y) > step * 3.5) { if (cur.length > 1) out.push(cur); cur = []; }
      cur.push([q.x, q.y]); prev = q;
    }
    if (cur.length > 1) out.push(cur);
  } catch (err) {}
  return out;
}
function polyLen(p) { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; }
/* Join strokes into one line. Icons: greedy nearest-neighbour order, strokes reversed or rotated as needed.
   The pen's travel between strokes is marked as connector and drawn faintly. */
function joinSubs(subs, reorder, unit) {
  const closed = (s) => Math.hypot(s[0][0] - s[s.length - 1][0], s[0][1] - s[s.length - 1][1]) < unit * 0.3;
  let rest = subs.slice();
  if (reorder) rest.sort((a, b) => polyLen(b) - polyLen(a));
  const pts = [], conn = [], hi = [];
  const push = (s, isConnBefore) => {
    if (pts.length) { conn[pts.length - 1] = isConnBefore; hi[pts.length - 1] = false; }
    for (let i = 0; i < s.length; i++) { pts.push(s[i]); if (i < s.length - 1) { conn.push(false); hi.push(!!s.hi); } }
  };
  const keepHi = (src, dst) => { dst.hi = src.hi; return dst; };
  let first = rest.shift();
  if (reorder && closed(first) && rest.length) {
    // start (and end) the outline where the next stroke is closest, so the pen's way over is short
    const targets = [];
    rest.forEach(s => { targets.push(s[0], s[s.length - 1]); if (closed(s)) for (let i = 4; i < s.length - 1; i += 4) targets.push(s[i]); });
    let k = 0, best = Infinity;
    for (let i = 0; i < first.length - 1; i += 2) for (const q of targets) { const d = (first[i][0] - q[0]) ** 2 + (first[i][1] - q[1]) ** 2; if (d < best) { best = d; k = i; } }
    first = keepHi(first, first.slice(k).concat(first.slice(1, k + 1)));
  }
  push(first, false);
  while (rest.length) {
    const end = pts[pts.length - 1];
    let bi = 0, bd = Infinity, how = 'fwd', bk = 0;
    if (!reorder) { bi = 0; how = 'fwd'; }
    else rest.forEach((s, i) => {
      const d0 = Math.hypot(s[0][0] - end[0], s[0][1] - end[1]), d1 = Math.hypot(s[s.length - 1][0] - end[0], s[s.length - 1][1] - end[1]);
      if (d0 < bd) { bd = d0; bi = i; how = 'fwd'; }
      if (d1 < bd) { bd = d1; bi = i; how = 'rev'; }
      if (closed(s)) for (let k = 2; k < s.length - 1; k += 2) { const dk = Math.hypot(s[k][0] - end[0], s[k][1] - end[1]); if (dk < bd) { bd = dk; bi = i; how = 'rot'; bk = k; } }
    });
    let s = rest.splice(bi, 1)[0];
    if (how === 'rev') s = keepHi(s, s.slice().reverse());
    else if (how === 'rot') s = keepHi(s, s.slice(bk).concat(s.slice(1, bk + 1)));
    const gap = Math.hypot(s[0][0] - end[0], s[0][1] - end[1]);
    push(s, gap > unit * 0.05);
  }
  return { pts, conn, hi };
}
function resampleMasked(pts, conn, n = N_PTS, hi = null) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1];
  if (!(total > 0)) return null;
  const out = [], oc = new Uint8Array(n), oh = new Uint8Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = total * i / (n - 1);
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const seg = (cum[j + 1] - cum[j]) || 1, f = (s - cum[j]) / seg;
    out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]);
    oc[i] = conn && conn[j] ? 1 : 0;
    oh[i] = hi && hi[j] ? 1 : 0;
  }
  return { pts: out, conn: oc, hi: oh };
}
function normalsOf(P) {
  const n = P.length, N = [];
  let len = 0;
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 2)], b = P[Math.min(n - 1, i + 2)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    N.push([-dy / l, dx / l]);
    if (i) len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  }
  return { nrm: N, len };
}
function normalizeMotif(r) {
  if (!r) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of r.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const w = x1 - x0, h = y1 - y0, s = Math.max(w, h);
  if (!(s > 0)) return null;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const P = r.pts.map(([x, y]) => [(x - cx) / s, (y - cy) / s]);
  const { nrm, len } = normalsOf(P);
  return { pts: P, nrm, conn: r.conn || new Uint8Array(P.length), hi: r.hi || new Uint8Array(P.length), w: w / s, h: h / s, len };
}
/* ds: list of SVG path strings. unit: size of one grid step (24-box icons: 1, 100-box drawings: ~4) */
function buildMotif(ds, reorder, unit) {
  const subs = [];
  for (const d of ds) {
    const isHi = d.startsWith('!');
    for (const sp of subpathsOf(isHi ? d.slice(1) : d, unit)) { sp.hi = isHi; subs.push(sp); }
  }
  if (!subs.length) return null;
  const j = joinSubs(subs, reorder, unit);
  return normalizeMotif(resampleMasked(j.pts, j.conn, N_PTS, j.hi));
}
function motifFromD(d) { return buildMotif([d], false, 4); }
function motifFromPts(pts) { return normalizeMotif(resampleMasked(pts, null)); }

/* KI motifs live in this store (from proposals, the saved state, the memory and the team library) */
const kiStore = new Map();
function registerKi(m) { if (m && typeof m.id === 'string' && m.id.startsWith('ki-') && (typeof m.d === 'string' || (typeof m.icon === 'string' && ICONS[m.icon]))) kiStore.set(m.id, m); }
function motifInfo(id) {
  if (typeof id !== 'string') return null;
  if (id.startsWith('ki-')) {
    const k = kiStore.get(id);
    if (!k) return null;
    return k.icon ? { id, name: k.titel, ki: true, icon: k.icon, alt: { de: `das Symbol «${k.titel}»`, en: `the symbol "${iconLabel(k.icon)}"` } }
      : { id, name: k.titel, ki: true, alt: { de: `das Motiv «${k.titel}»`, en: `the motif "${k.titel}"` }, d: k.d };
  }
  if (id.startsWith('icon:')) {
    const name = id.slice(5);
    if (!ICONS[name]) return null;
    const label = ICON_DE[name] || iconTitles[name] || EN_DE[name] || iconLabel(name);
    return { id, name: label, icon: name, alt: { de: `das Symbol «${label}»`, en: `the symbol "${iconLabel(name)}"` } };
  }
  return MOTIF_BY_ID[id] || null;
}
const motifCache = new Map();
function motifData(id, key, variant) {
  const info = motifInfo(id) || motifInfo('icon:lightbulb');
  const ck = info.icon ? 'icon:' + info.icon : info.gen ? `${info.id}|${key}|${variant}` : info.id + (info.d ? '|' + info.d.length : '');
  let m = motifCache.get(ck);
  if (m) return m;
  if (info.icon) m = buildMotif(ICONS[info.icon].split('|'), true, 1);
  else if (info.gen) { const g = info.gen(mulberry32(strHash(`${key}|${info.id}|${variant}`)), key); m = g.d ? motifFromD(g.d) : motifFromPts(g.pts); }
  else if (info.d) m = motifFromD(info.d);
  if (!m) m = motifFromPts(Array.from({ length: 200 }, (_, i) => [Math.cos(i / 199 * TAU), Math.sin(i / 199 * TAU)]));
  if (motifCache.size > 120) motifCache.clear();
  motifCache.set(ck, m);
  return m;
}

/* Morph: B is re-ordered (reversed, and rotated if closed) so its points travel the shortest way from A */
const morphCache = new Map();
function morphData(MA, MB, ck) {
  let m = morphCache.get(ck);
  if (m) return m;
  const n = MA.pts.length;
  const closed = Math.hypot(MB.pts[0][0] - MB.pts[n - 1][0], MB.pts[0][1] - MB.pts[n - 1][1]) < 0.02;
  const idx = Array.from({ length: n }, (_, i) => i), rev = idx.slice().reverse();
  const variants = [idx, rev];
  if (closed) for (let k = 40; k < n; k += 40) { variants.push(idx.slice(k).concat(idx.slice(0, k))); variants.push(rev.slice(k).concat(rev.slice(0, k))); }
  let best = idx, bd = Infinity;
  for (const v of variants) {
    let d = 0;
    for (let i = 0; i < n; i += 8) d += Math.hypot(MA.pts[i][0] - MB.pts[v[i]][0], MA.pts[i][1] - MB.pts[v[i]][1]);
    if (d < bd) { bd = d; best = v; }
  }
  const pts = best.map(i => MB.pts[i]);
  const conn = new Uint8Array(n), hiB = new Uint8Array(n);
  for (let i = 0; i < n - 1; i++) { const a = best[i], b = best[i + 1], adj = Math.abs(a - b) === 1; conn[i] = MB.conn[Math.min(a, b)] && adj ? 1 : 0; hiB[i] = MB.hi[Math.min(a, b)] && adj ? 1 : 0; }
  const nb = normalsOf(pts);
  m = { A: MA, B: { pts, nrm: nb.nrm, len: nb.len, conn, hi: hiB }, w: Math.max(MA.w, MB.w), h: Math.max(MA.h, MB.h) };
  if (morphCache.size > 30) morphCache.clear();
  morphCache.set(ck, m);
  return m;
}
/* The line rewrites itself in a wave along the pen's path: at any moment most of it is
   either still the first motif or already the second, only a short stretch is on its way. */
const MORPH_WAVE = 0.75;
function morphFrame(md, t) {
  const n = md.A.pts.length, pts = new Array(n), nrm = new Array(n), conn = new Uint8Array(n), hi = new Uint8Array(n), transit = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = clamp(t * (1 + MORPH_WAVE) - (i / (n - 1)) * MORPH_WAVE, 0, 1);
    const ti = x * x * (3 - 2 * x);
    const a = md.A.pts[i], b = md.B.pts[i], na = md.A.nrm[i], nb = md.B.nrm[i];
    pts[i] = [a[0] + (b[0] - a[0]) * ti, a[1] + (b[1] - a[1]) * ti];
    const nx = na[0] + (nb[0] - na[0]) * ti, ny = na[1] + (nb[1] - na[1]) * ti, l = Math.hypot(nx, ny) || 1;
    nrm[i] = [nx / l, ny / l];
    conn[i] = ti < 0.5 ? md.A.conn[i] : md.B.conn[i];
    hi[i] = ti < 0.5 ? md.A.hi[i] : md.B.hi[i];
    transit[i] = Math.sin(Math.PI * ti);
  }
  return { pts, nrm, conn, hi, transit, len: md.A.len + (md.B.len - md.A.len) * t, w: md.w, h: md.h };
}

/* Signature in the header: the pen signs right after the drawing is complete and the signature leaves with it */
function drawBotSignature(cx, cy, size, color, hiColor) {
  // a calm sender: always complete, no movement, so the eye stays with the main line
  const M = motifData('icon:digital-age-bot', '', 0);
  const S = size / Math.max(M.w, M.h);
  const P = M.pts.map(([x, y]) => [cx + x * S, cy + y * S]);
  const lw = Math.max(1.2, size * 0.042);
  LINE_HI = hiColor && hiColor !== color ? { mask: M.hi, color: hiColor } : null;
  strokeRange(P, 0, P.length - 1, lw, color, 'feder', 1, M.conn, null);
  LINE_HI = null;
}

/* Where the line is in the loop: visible range [s0, s1] of the path, pen position, light etc. */
const LINE_HERO = { zeichnen: 0.57, lichtlauf: 0.82, atmen: 0, aufloesen: 0.5, morph: 0.66, faden: 0.58, zweistift: 0.58, kamera: 0.66, entwurf: 0.67, schreiben: 0.77 };
function linePhase(anim, p) {
  p = ((p % 1) + 1) % 1;
  if (anim === 'zeichnen') {
    const s1 = easeIO(clamp(p / 0.46, 0, 1)), s0 = easeIO(clamp((p - 0.7) / 0.27, 0, 1));
    return { s0, s1, pen: p < 0.46 ? s1 : (p > 0.7 && p < 0.97 ? s0 : -1) };
  }
  if (anim === 'aufloesen') {
    const s1 = easeIO(clamp(p / 0.42, 0, 1)), s0 = clamp((p - 0.6) / 0.26, 0, 1);
    return { s0, s1, pen: p < 0.42 ? s1 : -1, dissolve: true };
  }
  if (anim === 'morph') {
    if (p < 0.24) { const s1 = easeIO(p / 0.24); return { s0: 0, s1, t: 0, pen: s1 }; }
    if (p < 0.34) return { s0: 0, s1: 1, t: 0, pen: -1 };
    if (p < 0.6) return { s0: 0, s1: 1, t: (p - 0.34) / 0.26, pen: -1 };
    if (p < 0.72) return { s0: 0, s1: 1, t: 1, pen: -1 };
    const s0 = easeIO(clamp((p - 0.72) / 0.25, 0, 1));
    return { s0, s1: 1, t: 1, pen: p < 0.97 ? s0 : -1 };
  }
  if (anim === 'faden') {
    // a straight thread pulls itself into the motif and back
    const t = p < 0.08 ? 0 : p < 0.45 ? (p - 0.08) / 0.37 : p < 0.7 ? 1 : p < 0.95 ? 1 - (p - 0.7) / 0.25 : 0;
    return { s0: 0, s1: 1, t, faden: true, pen: -1, cap: clamp(t * 1.6 - 0.3, 0, 1) };
  }
  if (anim === 'zweistift') {
    const s = 0.5 * easeIO(clamp(p / 0.46, 0, 1)), er = 0.5 * easeIO(clamp((p - 0.7) / 0.27, 0, 1));
    return { s0: er, s1: 1 - er, ranges: [[er, s], [1 - s, 1 - er]], pens: p < 0.46 ? [s, 1 - s] : p > 0.7 && p < 0.97 ? [er, 1 - er] : [], cap: clamp((s - er) * 6, 0, 1) };
  }
  if (anim === 'kamera') {
    const s1 = easeIO(clamp(p / 0.58, 0, 1)), s0 = easeIO(clamp((p - 0.74) / 0.23, 0, 1));
    const zoom = p < 0.6 ? 1 + (KAM_Z - 1) * (1 - easeIO(clamp((p - 0.06) / 0.5, 0, 1))) : 1;
    return { s0, s1, zoom, pen: p < 0.58 ? s1 : p > 0.74 && p < 0.97 ? s0 : -1 };
  }
  if (anim === 'entwurf') {
    const s1 = easeIO(clamp((p - 0.12) / 0.46, 0, 1)), s0 = easeIO(clamp((p - 0.78) / 0.19, 0, 1));
    const guide = p < 0.7 ? 1 : p < 0.76 ? 1 - 0.6 * easeIO((p - 0.7) / 0.06) : 0.4 * (1 - easeIO(clamp((p - 0.8) / 0.14, 0, 1)));
    return { s0, s1, build: clamp(p / 0.16, 0, 1), guide, pen: p > 0.12 && p < 0.58 ? s1 : p > 0.78 && p < 0.97 ? s0 : -1 };
  }
  if (anim === 'schreiben') {
    const s1 = easeIO(clamp(p / 0.34, 0, 1)), w1 = easeIO(clamp((p - 0.4) / 0.29, 0, 1));
    const alpha = p < 0.8 ? 1 : 1 - easeIO(clamp((p - 0.8) / 0.15, 0, 1));
    return { s0: 0, s1, write: w1, travel: clamp((p - 0.34) / 0.06, 0, 1), alpha, pen: p < 0.34 ? s1 : -1, wpen: p > 0.4 && p < 0.69 ? w1 : -1 };
  }
  if (anim === 'lichtlauf') {
    const c = -0.06 + 1.36 * easeIO(clamp(p / 0.62, 0, 1));
    const glow = p < 0.62 ? 0 : p < 0.72 ? easeIO((p - 0.62) / 0.1) : p < 0.9 ? 1 : 1 - easeIO((p - 0.9) / 0.1);
    return { s0: 0, s1: 1, comet: c, glow, pen: p < 0.62 && c > 0 && c < 1 ? c : -1 };
  }
  return { s0: 0, s1: 1, pen: 0.5 - 0.5 * Math.cos(TAU * p), breathe: true };
}


/* Faden: a straight line with as many points as the motif */
const KAM_Z = 3.2;
const lineCache = new Map();
function lineMotif(n, hw, y) {
  const ck = `${n}|${hw.toFixed(2)}|${y.toFixed(3)}`;
  let m = lineCache.get(ck);
  if (m) return m;
  const pts = Array.from({ length: n }, (_, i) => [-hw + 2 * hw * i / (n - 1), y]);
  const nl = normalsOf(pts);
  m = { pts, nrm: nl.nrm, len: nl.len, conn: new Uint8Array(n), hi: new Uint8Array(n), w: 2 * hw, h: 0.01 };
  if (lineCache.size > 20) lineCache.clear();
  lineCache.set(ck, m);
  return m;
}
/* Schreibschrift: the keyword in the single-stroke script, joined in writing order */
const wordCache = new Map();
function wordMotif(text) {
  let m = wordCache.get(text);
  if (m) return m;
  const subs = [];
  let x = 0;
  for (const ch0 of text) {
    const ch = ch0 === 'ẞ' ? 'ß' : ch0;
    const g = SCRIPT_FONT.g[ch] || SCRIPT_FONT.g[ch.normalize('NFD')[0]] || null;
    if (!g) { x += 378; continue; }
    if (g[1]) for (const sp of subpathsOf(g[1], 12)) subs.push(sp.map(([px, py]) => [px + x, -py]));
    x += g[0];
  }
  if (!subs.length) return null;
  const j = joinSubs(subs, false, 12);
  m = normalizeMotif(resampleMasked(j.pts, j.conn, 1400, null));
  if (wordCache.size > 20) wordCache.clear();
  wordCache.set(text, m);
  return m;
}
function writeText() { return (state.text || '').replace(/\s+/g, ' ').trim(); }
/* Entwurf: construction lines like a blueprint, from the motif's own measures */
function drawGuides(R, P, lw, color, build, guide) {
  if (guide <= 0.01 || build <= 0) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let r = 0;
  for (const [x, y] of P) r = Math.max(r, Math.hypot(x - cx, y - cy));
  const items = [
    ['h', y0], ['h', cy], ['h', y1], ['v', x0], ['v', cx], ['v', x1], ['c', r * 1.02], ['d', 0], ['c', r * 0.5],
  ];
  ctx.save();
  ctx.strokeStyle = color; ctx.lineCap = 'butt';
  ctx.lineWidth = Math.max(1, lw * 0.22);
  ctx.setLineDash([lw * 1.1, lw * 1.1]);
  items.forEach(([kind, v], i) => {
    const q = clamp(build * items.length - i, 0, 1);
    if (q <= 0) return;
    ctx.globalAlpha = 0.34 * guide * (kind === 'c' || kind === 'd' ? 0.8 : 1);
    ctx.beginPath();
    if (kind === 'h') { ctx.moveTo(R.x, v); ctx.lineTo(R.x + R.w * q, v); }
    else if (kind === 'v') { ctx.moveTo(v, R.y); ctx.lineTo(v, R.y + R.h * q); }
    else if (kind === 'c') ctx.arc(cx, cy, v, -Math.PI / 2, -Math.PI / 2 + TAU * q);
    else { ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q); ctx.moveTo(x1, y0); ctx.lineTo(x1 - (x1 - x0) * q, y0 + (y1 - y0) * q); }
    ctx.stroke();
  });
  // small measurement marks at the corners of the motif box
  ctx.setLineDash([]); ctx.globalAlpha = 0.5 * guide * clamp(build * 2 - 1, 0, 1); ctx.lineWidth = Math.max(1, lw * 0.3);
  const m = lw * 1.6;
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + sy * m); ctx.lineTo(x, y); ctx.lineTo(x + sx * m, y); ctx.stroke();
  }
  ctx.restore();
}

/* Runs of drawn vs. connector segments inside [i0, i1] */
/* run types: 0 drawn, 1 connector (pen travelling), 2 highlighted stroke */
function runsOf(conn, i0, i1, hi) {
  const out = [];
  const typ = (i) => (conn && conn[i]) ? 1 : (hi && hi[i]) ? 2 : 0;
  let a = i0, c = typ(i0);
  for (let i = i0; i < i1; i++) {
    const ci = typ(i);
    if (ci !== c) { out.push([a, i, c]); a = i; c = ci; }
  }
  out.push([a, i1, c]);
  return out;
}
const CONN_ALPHA = 0.32, CONN_WIN = 70;
let LINE_HI = null;   // { mask, color } while the main line is drawn
/* Connectors (the pen's way between strokes) only show near the moving pen: cv = { at: index, win: points } */
function strokeRange(P, i0, i1, lw, color, style, seed, conn, cv) {
  if (i1 <= i0) return;
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const base = ctx.globalAlpha;
  for (const [a, b, type] of runsOf(conn, i0, i1, LINE_HI && LINE_HI.mask)) {
    if (b <= a) continue;
    const isConn = type === 1, col = type === 2 ? LINE_HI.color : color;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    if (isConn) {
      if (!cv) continue;
      const lo = cv.fn ? a : Math.max(a, Math.round(cv.at - cv.win)), hi = cv.fn ? b : Math.min(b, Math.round(cv.at + cv.win));
      if (hi <= lo) continue;
      ctx.lineWidth = Math.max(1, lw * 0.45);
      ctx.lineCap = 'butt';
      for (let c0 = lo; c0 < hi; c0 += 6) {
        const c1 = Math.min(hi, c0 + 6), mid = (c0 + c1) / 2;
        const al = cv.fn ? cv.fn(Math.round(mid)) : CONN_ALPHA * (1 - Math.abs(mid - cv.at) / cv.win);
        if (al <= 0.01) continue;
        ctx.globalAlpha = base * clamp(al, 0, 1);
        ctx.beginPath(); ctx.moveTo(P[c0][0], P[c0][1]);
        for (let i = c0 + 1; i <= c1; i++) ctx.lineTo(P[i][0], P[i][1]);
        ctx.stroke();
      }
      ctx.globalAlpha = base; ctx.lineCap = 'round';
      continue;
    }
    if (style === 'raster') {
      const d = Math.hypot(P[Math.min(a + 1, P.length - 1)][0] - P[a][0], P[Math.min(a + 1, P.length - 1)][1] - P[a][1]) || 1;
      const step = Math.max(1, Math.round(lw * 2.1 / d)), s = lw * 1.45, r = s * 0.28;
      ctx.beginPath();
      for (let i = a; i <= b; i += step) rr(ctx, P[i][0] - s / 2, P[i][1] - s / 2, s, s, r);
      ctx.fill();
    } else if (style === 'pinsel') {
      let q = -1;
      const ph = (seed % 628) / 100;
      for (let i = a; i < b; i++) {
        const taper = 0.3 + 0.7 * Math.min(1, (i - a) / 40, (b - i) / 40);
        const w = lw * (0.45 + 0.9 * (0.5 + 0.5 * Math.sin(i * 0.021 + ph))) * taper;
        const qw = Math.round(w * 2) / 2;
        if (qw !== q) { if (q > 0) ctx.stroke(); ctx.lineWidth = Math.max(0.8, qw); ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); q = qw; }
        ctx.lineTo(P[i + 1][0], P[i + 1][1]);
      }
      ctx.stroke();
    } else {
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]);
      for (let i = a + 1; i <= b; i++) ctx.lineTo(P[i][0], P[i][1]);
      ctx.stroke();
    }
  }
}
function penTip(pt, lw, color) {
  const s = lw * 2.5;
  ctx.fillStyle = color;
  ctx.beginPath(); rr(ctx, pt[0] - s / 2, pt[1] - s / 2, s, s, s * 0.28); ctx.fill();
}
function drawComet(P, c0, c1, lw, color, conn) {
  const head = clamp(Math.round(c1 * (P.length - 1)), 0, P.length - 1);
  const n = P.length, chunks = 12;
  for (let k = 0; k < chunks; k++) {
    const a = c0 + (c1 - c0) * k / chunks, b = c0 + (c1 - c0) * (k + 1) / chunks;
    const i0 = clamp(Math.round(a * (n - 1)), 0, n - 1), i1 = clamp(Math.round(b * (n - 1)) + 1, 0, n - 1);
    ctx.globalAlpha = 0.12 + 0.88 * Math.pow((k + 1) / chunks, 1.6);
    strokeRange(P, i0, i1, lw * (1 + 0.45 * (k + 1) / chunks), color, 'feder', 0, conn, { at: head, win: 140 });
  }
  ctx.globalAlpha = 1;
}
function drawDissolve(P, p, lw, pal, conn) {
  const n = P.length, K = 110;
  for (let j = 0; j < K; j++) {
    const s = j / (K - 1), tj = 0.6 + 0.26 * s, age = (p - tj) / 0.15;
    if (age <= 0 || age >= 1) continue;
    const ii = clamp(Math.round(s * (n - 1)), 0, n - 1);
    if (conn && conn[ii]) continue;
    const pt = P[ii];
    const a = hash(j * 7.7) * TAU, dist = lw * (3 + 9 * hash(j * 3.1)) * age;
    const x = pt[0] + Math.cos(a) * dist, y = pt[1] + Math.sin(a) * dist - lw * 7 * age;
    const sz = lw * 1.6 * (1 - 0.55 * age);
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = j % 4 === 0 ? pal.signal : pal.accent;
    ctx.beginPath(); rr(ctx, x - sz / 2, y - sz / 2, sz, sz, sz * 0.28); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawBigCaption(R, pal, e, L) {
  const txt = kineticText(e);
  const f = fit(ctx, txt, R.w * 0.88, R.h * 0.62, Math.min(R.w * 0.2, R.h * 0.4), 700, 'grotesk', 1.02);
  const font = fontStr(700, f.px, 'grotesk');
  const capA = capAscent(font);
  ctx.font = font; setLS(ctx, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  ctx.strokeStyle = pal.fg; ctx.globalAlpha = 0.15; ctx.lineWidth = Math.max(1.5, f.px * 0.012);   // calm enough not to fight the drawing
  const blockH = f.lines.length * f.px * 1.02;
  f.lines.forEach((ln, i) => ctx.strokeText(ln, R.x + R.w / 2, R.y + (R.h - blockH) / 2 + i * f.px * 1.02 + (f.px * 1.02 + capA) / 2));
  ctx.globalAlpha = 1;
}
function drawSmallCaption(R, pal, e, px, alpha) {
  if (alpha <= 0.01) return;
  const txt = kineticText(e).toLocaleUpperCase('de-CH');
  const font = fontStr(500, px, 'mono');
  ctx.font = font; setLS(ctx, px * 0.16);
  const tw = ctx.measureText(txt).width;
  const s = px * 0.55, gap = px * 0.9;
  const x = R.x + (R.w - (tw + s + gap)) / 2, y = R.y + R.h - px * 1.1;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pal.signal; ctx.beginPath(); rr(ctx, x, y - capAscent(font) / 2 - s / 2, s, s, s * 0.28); ctx.fill();
  ctx.fillStyle = pal.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(txt, x + s + gap, y);
  setLS(ctx, 0); ctx.globalAlpha = 1;
}
function lineScreen(M, cx, cy, S, ang, A, seed, p, breathe) {
  const n = M.pts.length;
  // slow sway: small circles stay round, long strokes look drawn by hand
  const f1 = 1.4 * TAU * M.len / (n - 1), f2 = 3.3 * TAU * M.len / (n - 1);
  const w0 = (seed % 1000) / 1000 * TAU;
  const a1 = breathe ? Math.sin(TAU * p) * 1.4 : 0, a2 = breathe ? Math.cos(TAU * p) * 1.1 : 0;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = new Array(n);
  for (let i = 0; i < n; i++) {
    const px = M.pts[i][0], py = M.pts[i][1], nx = M.nrm[i][0], ny = M.nrm[i][1];
    const w = A * (0.62 * Math.sin(i * f1 + w0 + a1) + 0.38 * Math.sin(i * f2 + w0 * 2.3 + a2));
    const x = px + nx * w, y = py + ny * w;
    P[i] = [cx + (x * ca - y * sa) * S, cy + (x * sa + y * ca) * S];
  }
  return P;
}
function drawLine(R, p, e, pal, L, key) {
  const ph = linePhase(e.anim, p);
  const base = motifData(e.motif, key, state.variant);
  const u = L.u;
  const lw0 = Math.max(1.5, u * WEIGHTS[e.weight][1]);
  const capPx = Math.max(12, Math.round(u * 0.027));
  const writing = e.anim === 'schreiben' && writeText();
  const capH = e.caption === 'unten' && !writing ? capPx * 3.2 : 0;
  const box = { x: R.x, y: R.y, w: R.w, h: R.h - capH };
  const wordBox = writing ? { x: box.x, y: box.y + box.h * 0.66, w: box.w, h: box.h * 0.3 } : null;
  if (writing) box.h *= 0.66;
  let md = null;
  if (e.anim === 'morph') md = morphData(base, motifData(e.motif2, key, state.variant), `${e.motif}>${e.motif2}|${key}|${state.variant}`);
  const dimW = md ? md.w : base.w, dimH = md ? md.h : base.h;
  // angeschnitten crops only a little: a symbol must stay recognisable
  const k = e.comp === 'gross' ? 0.9 : e.comp === 'versetzt' ? 0.86 : 0.82;
  const pad = lw0 * 2.5;
  const breath = ph.breathe ? Math.sin(TAU * p) : 0;
  const S = Math.min((box.w - pad * 2) / Math.max(dimW, 0.2), (box.h - pad * 2) / Math.max(dimH, 0.2)) * k * e.scale * (1 + 0.018 * breath);
  const side = e.align === 'left' ? -1 : 1;
  const cx = box.x + box.w / 2 + (e.comp === 'versetzt' ? side * box.w * 0.13 : 0);
  const cy = box.y + box.h / 2 + (e.comp === 'versetzt' ? box.h * 0.04 : 0);
  let M;
  if (md) M = morphFrame(md, ph.t);
  else if (ph.faden) {
    const hw = (R.w * 0.6) / S;
    const lm = lineMotif(base.pts.length, hw, base.h * 0.42);
    M = morphFrame(morphData(lm, base, `faden|${e.motif}|${key}|${state.variant}|${hw.toFixed(2)}`), ph.t);
  } else M = base;
  const seed = strHash(e.motif + '|' + key);
  const A = e.wobble * u * 0.0055 / Math.max(1, S);
  const ang = e.angle * Math.PI / 180;
  if (e.caption === 'gross' && !writing) drawBigCaption(R, pal, e, L);
  let P = lineScreen(M, cx, cy, S, ang, A, seed, p, ph.breathe);
  const n = P.length, conn = M.conn;
  const idx = (s) => clamp(Math.round(s * (n - 1)), 0, n - 1);
  let lw = lw0;
  // Kamerafahrt: close to the pen first, then the camera pulls back
  if (ph.zoom > 1.001) {
    const z = ph.zoom, w = (z - 1) / (KAM_Z - 1), q = P[idx(ph.s1)];
    const fx = cx + (q[0] - cx) * w, fy = cy + (q[1] - cy) * w;
    P = P.map(([x, y]) => [cx + (x - fx) * z, cy + (y - fy) * z]);
    lw = lw0 * Math.sqrt(z);
  }
  if (ph.build !== undefined) drawGuides(R, P, lw, pal.fg, ph.build, ph.guide);
  const baseAlpha = ph.alpha === undefined ? 1 : ph.alpha;
  ctx.globalAlpha = baseAlpha;
  const ranges = ph.ranges || [[ph.s0, ph.s1]];
  const pens = ph.pens || (ph.pen >= 0 ? [ph.pen] : []);
  // while morphing, the whole line flows: the pen's ways show up and fade again
  const flowCv = ph.t > 0 && ph.t < 1 && M.transit ? { fn: (i) => 0.75 * M.transit[i] } : null;
  const cvFor = (r) => flowCv || (ph.breathe ? null : (() => {
    const pp = pens.find(q => Math.abs(q - r[1]) < 1e-6 || Math.abs(q - r[0]) < 1e-6);
    return pp === undefined ? null : { at: idx(pp), win: CONN_WIN };
  })());
  const twin = e.stroke === 'doppel';
  const twinAlpha = pal.fg === pal.accent ? 0.35 : 0.9;
  const off = lw * 1.25;
  const shifted = twin ? P.map(([x, y]) => [x + off, y + off * 0.8]) : null;
  // highlighted strokes (the bot's visor) and handwriting: the signal colour, else the other brand colour
  const hiColor = pal.signal !== pal.accent ? pal.signal : pal.accent === C_G ? C_O : pal.accent === C_O ? C_G : pal.fg;
  const mainHi = M.hi && M.hi.some(x => x) && hiColor !== pal.accent ? { mask: M.hi, color: hiColor } : null;
  if (ph.comet !== undefined) {
    if (twin) { ctx.globalAlpha = twinAlpha * (0.18 + 0.82 * ph.glow); strokeRange(shifted, 0, n - 1, lw * 0.8, pal.fg, 'feder', seed, conn); }
    ctx.globalAlpha = 0.22 + 0.78 * ph.glow;
    LINE_HI = mainHi;
    strokeRange(P, 0, n - 1, lw, pal.accent, twin ? 'feder' : e.stroke, seed, conn);
    ctx.globalAlpha = 1;
    const c1 = ph.comet, c0 = c1 - 0.28;
    if (c1 > 0 && c0 < 1) drawComet(P, Math.max(0, c0), Math.min(1, c1), lw, pal.accent, conn);
    LINE_HI = null;
  } else {
    if (twin) {
      const lag = linePhase(e.anim, p - 0.03);
      ctx.globalAlpha = twinAlpha * baseAlpha;
      for (const r of (lag.ranges || [[lag.s0, lag.s1]])) strokeRange(shifted, idx(r[0]), idx(r[1]), lw * 0.8, pal.fg, 'feder', seed, conn, null);
      ctx.globalAlpha = baseAlpha;
    }
    LINE_HI = mainHi;
    for (const r of ranges) strokeRange(P, idx(r[0]), idx(r[1]), lw, pal.accent, twin ? 'feder' : e.stroke, seed, conn, cvFor(r));
    LINE_HI = null;
    if (ph.dissolve) drawDissolve(P, ((p % 1) + 1) % 1, lw, pal, conn);
  }
  for (const q of pens) penTip(P[idx(q)], lw, pal.signal);
  if (writing) drawWriting(writing, wordBox, P[n - 1], ph, lw0, hiColor === pal.accent ? pal.fg : hiColor, pal.signal, seed);
  ctx.globalAlpha = 1;
  if (e.caption === 'unten' && !writing) {
    const vis = ph.cap !== undefined ? ph.cap : ph.comet !== undefined || ph.breathe ? 1 : clamp((ph.s1 - ph.s0) * 3, 0, 1);
    drawSmallCaption(R, pal, e, capPx, vis);
  }
}
function drawWriting(text, wb, from, ph, lw0, color, penColor, seed) {
  const W = wordMotif(text);
  if (!W) return;
  const Sw = Math.min(wb.w * 0.84 / Math.max(W.w, 0.05), wb.h * 0.92 / Math.max(W.h, 0.05));
  const P = W.pts.map(([x, y]) => [wb.x + wb.w / 2 + x * Sw, wb.y + wb.h * 0.45 + y * Sw]);
  const n = P.length, lw = lw0 * 0.85;
  // the pen's way from the drawing down to the first letter
  if (ph.travel > 0 && ph.write < 0.25) {
    const q = P[0], k = ph.travel;
    ctx.save();
    ctx.globalAlpha *= CONN_ALPHA * (1 - clamp(ph.write * 4, 0, 1));
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, lw * 0.45); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(from[0] + (q[0] - from[0]) * k, from[1] + (q[1] - from[1]) * k); ctx.stroke();
    ctx.restore();
    if (k < 1) penTip([from[0] + (q[0] - from[0]) * k, from[1] + (q[1] - from[1]) * k], lw0, penColor);
  }
  if (ph.write <= 0) return;
  const i1 = clamp(Math.round(ph.write * (n - 1)), 0, n - 1);
  strokeRange(P, 0, i1, lw, color, 'feder', seed, W.conn, ph.wpen >= 0 ? { at: i1, win: 40 } : null);
  if (ph.wpen >= 0) penTip(P[i1], lw0, penColor);
}
function drawMotifThumb(canvas, M, color, bg, hiColor) {
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  c.clearRect(0, 0, W, H);
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, H); }
  if (!M) return;
  const lw = Math.max(1.2, W * 0.028), pad = lw * 2 + W * 0.06;
  const S = Math.min((W - pad * 2) / Math.max(M.w, 0.2), (H - pad * 2) / Math.max(M.h, 0.2));
  c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
  const X = (i) => W / 2 + M.pts[i][0] * S, Y = (i) => H / 2 + M.pts[i][1] * S;
  c.lineWidth = lw;
  for (const [a, b, type] of runsOf(M.conn, 0, M.pts.length - 1, hiColor ? M.hi : null)) {
    if (type === 1) continue;
    c.strokeStyle = type === 2 ? hiColor : color;
    c.beginPath(); c.moveTo(X(a), Y(a));
    for (let i = a + 1; i <= b; i++) c.lineTo(X(i), Y(i));
    c.stroke();
  }
  c.globalAlpha = 1;
}
const ICON_MODS = new Set('off x plus minus check alert question dashed up down left right in out open closed cog search pen star heart dot lock unlock arrow arrows small big more horizontal vertical line lines cross slash diagonal pause play stop sync spark settings code user users fold unfold filled bar range pin share link remove add copy edit save upload download import export'.split(' '));
const ICON_FAMILIES = /^(square|circle|file|folder|layout|panel|toggle|text|table|list|grid|columns|rows|calendar|clipboard|align|move|scan|book|badge|battery|signal|mouse|monitor|tablet|laptop|smartphone|bookmark|message|mail|phone|cloud|server|database|hard|usb|volume|bell|image|sort|chart|replace|ratio|crop|tally|wrap|undo|redo|rotate|flip|tab|tags|wallet|ticket|shield|eye|pencil|pen|brush|zoom|send|subtitles|captions|kanban|gallery|section|spell|regex|whole|form|frame|cursor|pointer|hand|thumbs|sticky|notebook|receipt|qr|barcode|shopping|bring|sheet|film|video|camera|mic|radio|tv|speaker|headphone|plug|cable|power|wifi|bluetooth|cast|airplay|git|github|gitlab|figma|framer|chrome|codepen|codesandbox|dribbble|facebook|instagram|linkedin|twitter|youtube|twitch|slack|trello|pocket|rss)-/;
let promptIcons = null;
function promptIconNames() {
  if (promptIcons) return promptIcons;
  const set = new Set(Object.keys(ICON_DE));
  for (const n of Object.keys(ICONS)) {
    const parts = n.split('-');
    if (/\d/.test(n) || parts.length > 2) continue;
    if (parts.length === 2 && (ICON_MODS.has(parts[1]) || ICON_FAMILIES.test(n))) continue;
    set.add(n);
  }
  promptIcons = [...set].sort().join(', ');
  return promptIcons;
}
function resolveIcon(s) {
  if (typeof s !== 'string') return null;
  const n = s.trim().toLowerCase().replace(/^lucide[-:\s]*/, '').replace(/[\s_]+/g, '-');
  if (ICONS[n]) return n;
  return searchIcons(n.replace(/-/g, ' '), 1)[0] || null;
}
const kiShapeCache = new Map();
function kiShape(m) {
  const k = m.icon ? 'i:' + m.icon : 'd:' + m.d;
  let v = kiShapeCache.get(k);
  if (!v) { v = m.icon ? buildMotif(ICONS[m.icon].split('|'), true, 1) : motifFromD(m.d); if (kiShapeCache.size > 60) kiShapeCache.clear(); kiShapeCache.set(k, v); }
  return v;
}
function sanitizeD(d) {
  if (typeof d !== 'string') return null;
  d = d.trim();
  if (d.length < 10 || d.length > 8000 || !/^[Mm]/.test(d) || !/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\-+\s]+$/.test(d)) return null;
  return motifFromD(d) ? d : null;
}
function kiId(d) { return 'ki-' + strHash(d).toString(36); }
function sanitizeKi(o) {
  if (!o || typeof o !== 'object') return null;
  const keys = (Array.isArray(o.stichworte) ? o.stichworte : []).filter(x => typeof x === 'string')
    .map(x => normWord(x).replace(/[^a-z0-9-]/g, '')).filter(x => x.length >= 2 && x.length <= 30).slice(0, 10).join(' ');
  const base = { titel: String(o.titel || 'KI-Motiv').slice(0, 40), idee: String(o.idee || '').slice(0, 240), keys, blind: '' };
  const icon = o.icon ? resolveIcon(o.icon) : null;
  if (icon) return Object.assign(base, { id: 'ki-icon-' + icon, icon, status: 'symbol' });
  const d = sanitizeD(o.d);
  if (!d) return null;
  return Object.assign(base, { id: kiId(d), d, status: 'ungeprüft' });
}
function kiRecord(m) {
  const r = { id: m.id, titel: m.titel, idee: m.idee || '', keys: m.keys || '' };
  if (m.icon) r.icon = m.icon; else r.d = m.d;
  return r;
}
/* ---------- Titelmoment: the point in the loop where the drawing stands complete ---------- */
function heroPhase(e = effective()) { return LINE_HERO[e.anim] || 0; }

/* ---------- Post-Paket: alt text from the actual variant, post texts from Claude ---------- */
const ALT_ANIM = {
  de: { zeichnen: 'Eine durchgehende Linie zeichnet {m}, Strich für Strich, und verschwindet wieder', lichtlauf: 'Eine durchgehende Linie zeigt {m}; ein Lichtpunkt läuft die Linie entlang, dann leuchtet das ganze Motiv', atmen: 'Eine durchgehende Linie zeigt {m} und bewegt sich leicht wie von Hand gezeichnet', aufloesen: 'Eine durchgehende Linie zeichnet {m} und zerfällt danach in kleine Quadrate', morph: 'Eine durchgehende Linie zeichnet {m} und verwandelt sich dann in {m2}', faden: 'Eine gerade Linie zieht sich zusammen und wird zu {m}, danach wieder zur geraden Linie', schreiben: 'Eine durchgehende Linie zeichnet {m} und schreibt darunter in Schreibschrift «{w}»', kamera: 'Eine durchgehende Linie zeichnet {m}; die Kamera folgt zuerst ganz nah dem Stift und fährt dann zurück', entwurf: 'Feine Hilfslinien wie auf einem Bauplan erscheinen, dann zeichnet eine durchgehende Linie darüber {m}', zweistift: 'Zwei Stifte zeichnen {m} von beiden Enden her, bis sich die Linien in der Mitte treffen' },
  en: { zeichnen: 'A single continuous line draws {m}, stroke by stroke, and disappears again', lichtlauf: 'A single continuous line shows {m}; a point of light runs along it, then the whole motif lights up', atmen: 'A single continuous line shows {m} and moves gently as if drawn by hand', aufloesen: 'A single continuous line draws {m} and then breaks up into small squares', morph: 'A single continuous line draws {m} and then transforms into {m2}', faden: 'A straight line pulls together into {m} and then straightens out again', schreiben: 'A single continuous line draws {m} and writes "{w}" underneath in handwriting', kamera: 'A single continuous line draws {m}; the camera first follows the pen up close, then pulls back', entwurf: 'Fine construction lines appear like on a blueprint, then a single continuous line draws {m} over them', zweistift: 'Two pens draw {m} from both ends until the lines meet in the middle' },
};
/* ---------- Line engine API (one-line drawings) ---------- */
let memory = [];
function draw(R, p, e, wpal, L, key) { BASE = ctx.getTransform(); drawLine(R, p, e, wpal, L, key); }
function motifTop() {
  const cands = motifCandidates();
  const top = [];
  const add = (id) => { if (id && !top.includes(id) && motifInfo(id)) top.push(id); };
  for (const k of (state.kiMotifs || [])) add(k.id);
  for (const c of cands) add(c.id);
  add('dabot');
  const rest = [];
  for (const m of MOTIFS) if (!m.abstract && !top.includes(m.id)) rest.push(m.id);
  for (const m of MOTIFS) if (m.abstract && !top.includes(m.id)) rest.push(m.id);
  return { top, rest, matched: new Set(cands.filter(c => c.hit).map(c => c.id)) };
}
function reasonFor(e) {
  const info = motifInfo(e.motif);
  if (!info) return '';
  if (info.ki) return (kiStore.get(e.motif) || {}).idee || 'Von Claude gewählt';
  const cand = motifCandidates().find(c => c.id === e.motif);
  if (cand && cand.hit) return `Stichwort «${cand.hit}» im Beitrag`;
  if (cand && cand.fallback) return `Passend zur Rubrik ${state.rubrik}`;
  return ANIMS[e.anim].desc;
}
function summary(e) {
  const info = motifInfo(e.motif), info2 = motifInfo(e.motif2);
  const name = e.anim === 'morph' && info2 ? `${info ? info.name : '–'} → ${info2.name}` : (info ? info.name : '–');
  return { kind: 'Linie', main: `${name} · ${ANIMS[e.anim].name}`, tech: ANIMS[e.anim].name, reason: reasonFor(e) };
}
function altStatic(e, lang) {
  const en = lang === 'en';
  const shown = e.anim === 'morph' ? (motifInfo(e.motif2) || motifInfo(e.motif)) : motifInfo(e.motif);
  const m = shown ? shown.alt[en ? 'en' : 'de'] : (en ? 'a motif' : 'ein Motiv');
  const txt = writeText();
  let a = en ? `Graphic by digital age: ${m}, drawn as a single continuous line, ${ALT_COLOR.en[e.color]}.`
    : `Grafik von digital age: ${m}, gezeichnet als durchgehende Linie, ${ALT_COLOR.de[e.color]}.`;
  if (e.anim === 'entwurf') a += en ? ' Fine construction lines surround it like a blueprint.' : ' Feine Hilfslinien umgeben es wie auf einem Bauplan.';
  if (e.anim === 'schreiben' && txt) a += en ? ` Below it, in handwriting, "${txt}".` : ` Darunter in Schreibschrift «${txt}».`;
  else if (e.caption === 'unten' && txt) a += en ? ` Below it the words "${txt}".` : ` Darunter steht «${txt}».`;
  else if (e.caption === 'gross' && txt) a += en ? ` Behind it, in large outline letters, "${txt}".` : ` Dahinter in grossen Umrissbuchstaben «${txt}».`;
  return a;
}
function altAnimated(e, lang) {
  const L = lang === 'en' ? 'en' : 'de';
  const info = motifInfo(e.motif) || MOTIF_BY_ID['abs-harmo'];
  const m2 = motifInfo(e.motif2) || info;
  const txt = writeText();
  let a = (L === 'en' ? `Graphic by digital age, ${ALT_COLOR.en[e.color]}. ` : `Grafik von digital age, ${ALT_COLOR.de[e.color]}. `)
    + ALT_ANIM[L][e.anim].replace('{m}', info.alt[L]).replace('{m2}', m2.alt[L]).replace('{w}', txt) + '.';
  if (e.anim !== 'schreiben' && e.caption === 'unten' && txt) a += L === 'en' ? ` Below it the words "${txt}".` : ` Darunter steht «${txt}».`;
  if (e.anim !== 'schreiben' && e.caption === 'gross' && txt) a += L === 'en' ? ` Behind it, in large outline letters, "${txt}".` : ` Dahinter steht in grossen Umrissbuchstaben «${txt}».`;
  return a;
}
function options(e) {
  const pct = (v) => Math.round(v * 100) + ' %';
  return [
    { k: 'stroke', label: 'Strich', type: 'chips', opts: Object.entries(STROKES) },
    { k: 'weight', label: 'Strichstärke', type: 'chips', opts: Object.entries(WEIGHTS).map(([k, w]) => [k, w[0]]) },
    { k: 'comp', label: 'Komposition', type: 'chips', opts: Object.entries(COMPS) },
    e.anim !== 'schreiben' ? { k: 'caption', label: 'Schlagwort im Bild', type: 'chips', opts: Object.entries(CAPTIONS) } : null,
    { k: 'texture', label: 'Textur', type: 'chips', opts: Object.entries(TEX_LBL) },
    { k: 'angle', label: 'Neigung', type: 'chips', opts: LINE_ANGLES.map(a => [a, a === 0 ? 'Gerade' : `${a > 0 ? '+' : '−'}${Math.abs(a)}°`]) },
    { k: 'scale', label: 'Grösse', type: 'range', min: 0.6, max: 1.4, step: 0.01, fmt: pct },
    { k: 'wobble', label: 'Handschrift', type: 'range', min: 0, max: 1, step: 0.01, fmt: pct },
    { k: 'speed', label: 'Tempo', type: 'range', min: 0.5, max: 2, step: 0.05, fmt: (v) => v.toFixed(2) + '×' },
  ].filter(Boolean);
}
function animList() { return Object.entries(ANIMS).map(([k, a]) => `- ${k} (${a.name}): ${a.desc}`).join('\n'); }
return {
  id: 'line', name: 'Linie', ANIMS, MOTIFS, recipeFor, effective, fingerprint, similarity, checkFp, findVariant, heroPhase,
  loopLength: (e = effective()) => ANIMS[e.anim].base / e.speed,
  draw, summary, altStatic, altAnimated, options, animList, motifTop,
  motifInfo, motifData, drawMotifThumb, searchIcons, iconMotifId, iconLabel, ICON_DE, EN_DE,
  registerKi, kiStore, sanitizeKi, sanitizeD, kiId, kiRecord, kiShape, promptIconNames,
  drawBotSignature, writeText,
  dispose: () => { if (svgSampler.parentNode) svgSampler.parentNode.remove(); },
  avoidKey: (e) => e.motif,
  clearCaches: () => {},
  setMemory: (m) => { memory = m; },
};

})();
/* ===== Render-Logik und Fassade (aus quellen/hero/shell.js, DOM-freier Auszug) ===== */
const ENG = { line: LINE, typo: TYPO };
// Hero = das saubere Bild fuer die Website (ohne Logo und Headline: die Seite zeigt beides als Text).
// Social-Formate tragen Logo und Headline.
const VIEWS = [
  { id: 'hero', label: 'Hero', sub: '16:9 · Website', fmt: 'wide', brand: false, headline: false },
  { id: 'og', label: 'Teilen', sub: '1.91:1 · OG', fmt: 'og', brand: true, headline: true },
  { id: 'portrait', label: 'Feed', sub: '4:5', fmt: 'portrait', brand: true, headline: true },
  { id: 'story', label: 'Story', sub: '9:16', fmt: 'story', brand: true, headline: true },
  { id: 'square', label: 'Quadrat', sub: '1:1', fmt: 'square', brand: true, headline: true },
];
const VIEW_BY_ID = Object.fromEntries(VIEWS.map(v => [v.id, v]));
const clone = (o) => JSON.parse(JSON.stringify(o));

// Artikelfelder (im Prototyp ART): slug = seedKey, headline, rubrik, author, date, readMin, keyword, figure, lead, body.
let ART = { slug: '', headline: '', rubrik: '', author: '', date: '', readMin: 6, keyword: '', figure: '', lead: '', body: '' };
let kiKeyword = '';
let hsMemory = [];
let propSeq = 0;

/* ---------- engine state per proposal ---------- */
function specState(spec, fmt, view) {
  return Object.assign({}, ART, {
    text: spec.text != null ? spec.text : (ART.keyword || kiKeyword),
    figure: spec.figure != null ? spec.figure : ART.figure,
    postNotes: [ART.lead, ART.body].filter(Boolean).join('\n').slice(0, 6000),
    variant: spec.variant || 0, overrides: spec.overrides || {}, kiMotifs: spec.kiMotifs || [], pinned: null,
    format: fmt || 'wide', showBrand: !!(view && view.brand), showHeadline: !!(view && view.headline),
    sigStyle: 'bot', kiCheck: true, postLang: 'auto',
  });
}
function withState(st, fn) {
  const prev = state;
  state = st;
  try { return fn(); } finally { state = prev; }
}
const withSpec = (spec, fn) => withState(specState(spec, 'wide', null), fn);
const effOf = (spec) => withSpec(spec, () => ENG[spec.engine].effective());
function baseSpec(engine) { return { engine, variant: 0, overrides: {}, text: ART.keyword || kiKeyword, kiMotifs: [] }; }
function registerSpec(spec) { (spec.kiMotifs || []).forEach(m => LINE.registerKi(m)); }

/* ---------- rendering ---------- */
const layoutCacheHS = new Map();
function layoutFor(W, H) {
  const k = [W, H, state.showBrand, state.showHeadline, state.headline, state.author, state.date].join('|');
  let L = layoutCacheHS.get(k);
  if (!L) { L = computeLayout(W, H); if (layoutCacheHS.size > 40) layoutCacheHS.clear(); layoutCacheHS.set(k, L); }
  return L;
}
function drawBrand(L, pal, key, e) {
  const { m, W } = L;
  const h = L.brandH;
  const img = tintedLogo(pal.logo);
  if (img) ctx.drawImage(img, m, L.topY, h * img.width / img.height, h);
  const bs = Math.round(h * 1.05);
  const sc = SCHEMES[e.color] || {};
  const visor = sc.signal && sc.signal !== pal.logo ? sc.signal : pal.logo === C_O ? C_G : C_O;
  LINE.drawBotSignature(W - m - bs / 2, L.topY + h / 2, bs, pal.logo, visor);
}
/* Draws one proposal into a 2D context. time: { p } (loop position) or { sec } (seconds). */
function renderSpec(c2d, spec, time, viewOrId, scale = 1) {
  const view = typeof viewOrId === 'string' ? VIEW_BY_ID[viewOrId] : viewOrId;
  const prevCtx = ctx;
  const E = ENG[spec.engine];
  withState(specState(spec, view.fmt, view), () => {
    ctx = c2d;
    try {
      const f = FORMATS[view.fmt], W = f.w, H = f.h;
      const e = E.effective();
      const key = articleKey();
      const T = E.loopLength(e);
      const p = time.p != null ? ((time.p % 1) + 1) % 1 : (((time.sec % T) + T) % T) / T;
      const scp = schemePalettes(e.color);
      const pal = scp.frame, wpal = scp.win;
      const L = layoutFor(W, H), R = L.rect;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalAlpha = 1; setLS(ctx, 0);
      ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
      if (scp.filled) { ctx.fillStyle = wpal.bg; ctx.fillRect(R.x, R.y, R.w, R.h); }
      try { drawTexture(R, p, wpal, e, L, key); drawFigure(R, p, wpal, e, L); } catch (err) { console.error(err); }
      try { E.draw(R, p, e, wpal, L, key); } catch (err) { console.error(err); }
      ctx.restore();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalAlpha = 1; setLS(ctx, 0);
      if (state.showBrand) drawBrand(L, pal, key, e);
      if (state.showHeadline) drawHeadline(L, pal);
    } finally { ctx = prevCtx; }
  });
}
function heroP(spec) { return withSpec(spec, () => { const E = ENG[spec.engine]; return E.heroPhase(E.effective()); }); }
function loopOf(spec) { return withSpec(spec, () => { const E = ENG[spec.engine]; return E.loopLength(E.effective()); }); }
function fitCanvas(c, view, cssW) {
  const f = FORMATS[view.fmt];
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(w * f.h / f.w));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return w / f.w;
}

/* ---------- memory: the last heroes, so new ones look different ---------- */
function pushMemory() {
  LINE.setMemory(hsMemory.filter(m => m.engine === 'line'));
  TYPO.setMemory(hsMemory.filter(m => m.engine === 'typo'));
}
// Eintraege: { key, engine, title, variant, overrides, text, fp, kiMotifs, animated, savedAtMs }
function setMemory(list) {
  hsMemory = (Array.isArray(list) ? list : []).filter(x => x && x.key && x.fp && x.engine);
  hsMemory.forEach(m => (m.kiMotifs || []).forEach(k => LINE.registerKi(k)));
  pushMemory();
}
function memoryEntry(spec, animated) {
  const key = withSpec(spec, () => articleKey());
  const e = effOf(spec);
  return {
    key, engine: spec.engine, title: (ART.headline || '').replace(/\s+/g, ' ').trim().slice(0, 140),
    variant: spec.variant || 0, overrides: clone(spec.overrides || {}), text: spec.text || '',
    fp: withSpec(spec, () => ENG[spec.engine].fingerprint(e)),
    kiMotifs: (spec.kiMotifs || []).map(m => LINE.kiRecord(m)), animated: !!animated, savedAtMs: Date.now(),
  };
}
function recentHeroes() {
  const key = withSpec(baseSpec('line'), () => articleKey());
  return hsMemory.filter(m => m.key !== key).sort((a, b) => (b.savedAtMs || 0) - (a.savedAtMs || 0)).slice(0, 8);
}

/* ---------- proposals ---------- */
function newId() { propSeq += 1; return 'p' + propSeq; }
function autoSpec(engine, others) {
  const E = ENG[engine];
  return withSpec(baseSpec(engine), () => {
    const key = articleKey();
    const same = others.filter(o => o.engine === engine);
    const usedKeys = same.map(o => E.avoidKey(effOf(o)));
    const start = same.length ? Math.max(...same.map(o => o.variant || 0)) + 1 : 0;
    let v;
    if (engine === 'typo') v = E.findVariant(key, start, 1, usedKeys);
    else v = E.findVariant(key, start, 1, same.map(o => E.fingerprint(effOf(o))));
    for (let i = 0; i < 80 && usedKeys.includes(E.avoidKey(E.recipeFor(key, v))); i++) v += 1;
    const spec = Object.assign(baseSpec(engine), { id: newId(), variant: v, source: 'auto' });
    // few fitting motifs in the article: keep the motif, but never show the same motif with the same animation twice
    if (engine === 'line') {
      const e0 = withSpec(spec, () => E.effective());
      const taken = same.map(o => effOf(o)).filter(x => x.motif === e0.motif).map(x => x.anim);
      if (taken.includes(e0.anim)) {
        const free = ['faden', 'zeichnen', 'kamera', 'zweistift', 'lichtlauf', 'entwurf', 'aufloesen', 'atmen'].find(a => !taken.includes(a));
        if (free) spec.overrides = { anim: free };
      }
    }
    const sm = withSpec(spec, () => E.summary(E.effective()));
    spec.titel = sm.main; spec.why = sm.reason;
    return spec;
  });
}
// «Andere Variante» auf einer Karte: frischer Vorschlag derselben Technik, gleiche id (shell.js rerollProp)
function rerollSpec(old, others) {
  const fresh = autoSpec(old.engine, others.concat([old]));
  if (old.source === 'ki') { fresh.text = old.text; }
  fresh.id = old.id;
  return fresh;
}
// «Neu wuerfeln» im Detail: naechste Variante, Overrides weg (KI-Motiv bleibt), liefert eine Kopie (shell.js rollSel)
function rollSpec(s, others) {
  const E = ENG[s.engine];
  const out = clone(s);
  const keepMotif = s.engine === 'line' && s.overrides && String(s.overrides.motif || '').startsWith('ki-') ? s.overrides.motif : null;
  withSpec(s, () => {
    const key = articleKey();
    const cur = E.effective();
    const avoid = s.engine === 'typo' ? others.filter(o => o.engine === 'typo').map(o => E.avoidKey(effOf(o))).concat([cur.motion]) : others.filter(o => o.engine === 'line').map(o => E.fingerprint(effOf(o))).concat([E.fingerprint(cur)]);
    out.variant = E.findVariant(key, (s.variant || 0) + 1, 1, avoid);
  });
  out.overrides = keepMotif ? { motif: keepMotif } : {};
  return out;
}
// KI-Antwort in Specs (shell.js specsFromKi); v1: nur icon-Motive, eigene Zeichnungen (d) werden verworfen
function specsFromKi(res) {
  const out = [];
  const sw = typeof res.schlagwort === 'string' ? res.schlagwort.replace(/\s+/g, ' ').trim().slice(0, 26) : '';
  if (sw) kiKeyword = sw;
  const fig = typeof res.kennzahl === 'string' ? res.kennzahl.trim().slice(0, 12) : '';
  const lineBase = autoSpec('line', []);
  (Array.isArray(res.linie) ? res.linie : []).slice(0, 2).forEach((o, i) => {
    if (!o || typeof o !== 'object' || !o.icon) return;
    const m = LINE.sanitizeKi(Object.assign({}, o, { d: undefined, idee: o.warum || o.idee }));
    if (!m || !m.icon) return;
    LINE.registerKi(m);
    const ov = { motif: m.id };
    if (LINE.ANIMS[o.animation]) ov.anim = o.animation;
    if (SCHEMES[o.farbe]) ov.color = o.farbe;
    out.push({ id: newId(), engine: 'line', variant: lineBase.variant + i, overrides: ov, text: ART.keyword || sw, kiMotifs: [LINE.kiRecord(m)],
      titel: String(o.titel || m.titel).slice(0, 40), why: String(o.warum || '').slice(0, 220), source: 'ki' });
  });
  const typoBase = autoSpec('typo', []);
  (Array.isArray(res.typo) ? res.typo : []).slice(0, 2).forEach((o, i) => {
    const r = TYPO.sanitizeRegie(Object.assign({}, o, { color: o.farbe, begruendung: o.warum }));
    if (!r) return;
    out.push({ id: newId(), engine: 'typo', variant: typoBase.variant + i, overrides: r.ov, text: r.text || ART.keyword || sw, kiMotifs: [],
      titel: r.titel, why: r.begruendung, source: 'ki', figure: i === 1 && fig && !ART.figure ? fig : undefined });
  });
  return { specs: out, kiKeyword: sw };
}

/* ---------- per-spec helpers for the UI ---------- */
function summary(spec) { return withSpec(spec, () => ENG[spec.engine].summary(ENG[spec.engine].effective())); }
function altStatic(spec, lang) { return withSpec(spec, () => ENG[spec.engine].altStatic(ENG[spec.engine].effective(), lang)); }
function altAnimated(spec, lang) { return withSpec(spec, () => ENG[spec.engine].altAnimated(ENG[spec.engine].effective(), lang)); }
function fingerprint(spec) { return withSpec(spec, () => ENG[spec.engine].fingerprint(ENG[spec.engine].effective())); }
function checkFp(spec) { return withSpec(spec, () => { const E = ENG[spec.engine]; return E.checkFp(E.fingerprint(E.effective()), articleKey()); }); }
function options(spec) { return withSpec(spec, () => ENG[spec.engine].options(ENG[spec.engine].effective())); }
function motifTop(spec) { return withSpec(spec, () => LINE.motifTop()); }
function motifInfoFor(spec, id) { return withSpec(spec, () => LINE.motifInfo(id)); }
function articleKeyOf() { return withSpec(baseSpec('line'), () => articleKey()); }
function schemeList() { return Object.entries(SCHEMES).map(([k, c]) => `  ${k} = ${c.name}: ${c.desc}`).join('\n'); }
function setArticle(a) { ART = Object.assign({}, ART, a || {}); layoutCacheHS.clear(); }
function clearTextCaches() { capCache.clear(); fitCache.clear(); TYPO.clearCaches(); layoutCacheHS.clear(); }
function dispose() {
  clearTextCaches(); schemeCache.clear(); sigCache.clear(); tintCache.clear();
  hsMemory = []; pushMemory();
  LINE.dispose();
}

return {
  VIEWS, VIEW_BY_ID, FORMATS, SCHEMES, ANIMS: LINE.ANIMS, MODES: TYPO.MODES, MOTIFS: LINE.MOTIFS,
  ICON_DE: LINE.ICON_DE, EN_DE: LINE.EN_DE,
  setArticle, getArticle: () => ART, setKiKeyword: (s) => { kiKeyword = s || ''; }, getKiKeyword: () => kiKeyword,
  setMemory, recentHeroes, memoryEntry,
  renderSpec, heroP, loopOf, fitCanvas, effective: effOf, summary, altStatic, altAnimated, fingerprint, checkFp, options,
  motifTop, motifInfo: motifInfoFor, motifData: LINE.motifData, drawMotifThumb: LINE.drawMotifThumb,
  searchIcons: LINE.searchIcons, iconMotifId: LINE.iconMotifId, iconLabel: LINE.iconLabel,
  registerKi: LINE.registerKi, registerSpec, kiRecord: LINE.kiRecord, sanitizeKi: LINE.sanitizeKi, sanitizeRegie: TYPO.sanitizeRegie,
  promptIconNames: LINE.promptIconNames, animList: LINE.animList, motionList: TYPO.motionList, schemeList,
  baseSpec, autoSpec, rerollSpec, rollSpec, specsFromKi, articleKey: articleKeyOf, articleKeyFrom, detectLang, strHash,
  logoReady, clearTextCaches, dispose,
};
}
