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
