#!/usr/bin/env node
// Pixel-Vergleich der vendorten Hero-Engine gegen die Referenzbilder des Prototyps.
//   node scripts/hero-studio/compare-references.mjs <referenzen-ordner> [--out <ordner>] [--prototype <digital-age-hero-studio.html>]
// Env: PLAYWRIGHT_CORE (Pfad/Name des playwright-core-Pakets, Default "playwright-core"),
//      CHROMIUM (Pfad zum Chromium/headless_shell; leer = Playwright-Default).
// Teil 1: gegen die PNG-Referenzen aus referenzen.json (gerendert auf dem Rechner, der sie erzeugt hat).
// Teil 2 (--prototype): zusaetzlich gegen den Prototyp selbst, gerendert im SELBEN Chromium. Das trennt
//   Port-Fehler von Unterschieden der Text-Rasterung zwischen Plattformen.
// Exit 0 = alle Bilder innerhalb der Toleranz (<= 0,5 % Pixel mit Kanal-Abweichung > 16), sonst 1.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const refsDir = path.resolve(args[0] || '');
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const outDir = opt('--out') ? path.resolve(opt('--out')) : null;
const protoPath = opt('--prototype') ? path.resolve(opt('--prototype')) : null;
if (!args[0] || !fs.existsSync(path.join(refsDir, 'referenzen.json'))) {
  console.error('Aufruf: node scripts/hero-studio/compare-references.mjs <referenzen-ordner> [--out <ordner>] [--prototype <html>]');
  process.exit(2);
}
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(refsDir, 'referenzen.json'), 'utf8'));
const TOL_PCT = 0.5;
const MIME = { '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.html': 'text/html; charset=utf-8' };
const ALLOWED = ['src/lib/hero-studio/', 'public/fonts/', 'public/images/hero-studio/', 'scripts/hero-studio/'];

// Prototyp: die Render-Funktionen liegen in einer IIFE; fuer den Vergleich wird am Ende eine kleine
// Fassade auf window gelegt (nur in der Kopie im Speicher, die Datei bleibt unveraendert).
let protoHtml = null;
if (protoPath) {
  const src = fs.readFileSync(protoPath, 'utf8');
  const marker = '\n})();\n</script>';
  const i = src.lastIndexOf(marker);
  if (i < 0) { console.error('Prototyp: Einhaengepunkt nicht gefunden'); process.exit(2); }
  const expose = `
window.__proto = {
  ready: Promise.all([logoReady, document.fonts.ready]).then(() => { capCache.clear(); fitCache.clear(); TYPO.clearCaches(); layoutCacheHS.clear(); }),
  render: (art, spec, viewId, p) => {
    ART = Object.assign({}, ART, art); layoutCacheHS.clear();
    const view = VIEW_BY_ID[viewId]; const f = FORMATS[view.fmt];
    const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
    renderSpec(c.getContext('2d'), spec, { p }, view, 1);
    return c.toDataURL('image/png');
  },
};`;
  protoHtml = src.slice(0, i) + expose + src.slice(i);
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = null;
  if (url === '/page') file = path.join(repo, 'scripts/hero-studio/compare-page.html');
  else if (url === '/proto' && protoHtml) { res.writeHead(200, { 'content-type': MIME['.html'] }); res.end(protoHtml); return; }
  else if (url.startsWith('/repo/')) {
    const rel = path.normalize(url.slice(6));
    if (ALLOWED.some(a => rel.startsWith(a))) file = path.join(repo, rel);
  } else if (url.startsWith('/refs/')) file = path.join(refsDir, path.basename(url));
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
const newPage = async (url, readyFn) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.route('**/*', (r) => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
  page.on('pageerror', e => console.error('pageerror:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(url);
  await page.waitForFunction(readyFn, null, { timeout: 60000 });
  return page;
};
const page = await newPage(`http://127.0.0.1:${port}/page`, () => window.__ready === true);

// Der Prototyp hat die Referenzen mit seinem Default readMin = 6 gerendert (ART_DEFAULT in shell.js).
const art = Object.assign({ readMin: 6 }, manifest.artikel);
const VIEW_OF = { hero: ['hero', 'heroP'], mid: ['hero', 'midP'], og: ['og', 'heroP'], story: ['story', 'heroP'] };
if (outDir) fs.mkdirSync(outDir, { recursive: true });
const save = (name, dataUrl) => { if (outDir && dataUrl) fs.writeFileSync(path.join(outDir, name), Buffer.from(dataUrl.split(',')[1], 'base64')); };

async function runPart(label, suffix, sourceFor) {
  console.log(`\n== ${label} ==`);
  let fails = 0, n = 0;
  for (const ref of manifest.referenzen) {
    for (const [kind, file] of Object.entries(ref.files)) {
      const [viewId, pKey] = VIEW_OF[kind];
      const source = await sourceFor(ref, file, viewId, ref[pKey]);
      const r = await page.evaluate(([ref, art, source, viewId, p]) => window.__compare(ref, art, source, viewId, p), [ref, art, source, viewId, ref[pKey]]);
      n++;
      if (r.error) { fails++; console.log(`${file}: FEHLER ${r.error}`); continue; }
      const ok = r.pct <= TOL_PCT;
      if (!ok) fails++;
      console.log(`${file}: ${ok ? 'ok' : 'ABWEICHUNG'}  ${r.w}x${r.h}  ${r.bad} px mit Kanal-Abweichung > 16 (${r.pct.toFixed(4)} %), ${r.any} px ungleich, max Abweichung ${r.maxd}`);
      save(file.replace(/\.png$/, '.render.png'), r.renderPng);
      save(file.replace(/\.png$/, `${suffix}.diff.png`), r.diffPng);
    }
  }
  console.log(`${n} Bilder, ${fails} ausserhalb der Toleranz (${TOL_PCT} %).`);
  return fails;
}

let fails = await runPart('Teil 1: gegen die Referenzbilder (referenzen/*.png)', '', async (ref, file) => file);
if (protoHtml) {
  const proto = await newPage(`http://127.0.0.1:${port}/proto`, () => !!window.__proto);
  await proto.evaluate(() => window.__proto.ready);
  const protoFails = await runPart('Teil 2: gegen den Prototyp, gerendert im selben Chromium', '.proto', async (ref, file, viewId, p) => {
    const dataUrl = await proto.evaluate(([art, spec, viewId, p]) => window.__proto.render(art, spec, viewId, p), [Object.assign({}, art, { slug: ref.seedKey }), ref.spec, viewId, p]);
    save(file.replace(/\.png$/, '.proto.png'), dataUrl);
    return dataUrl;
  });
  fails += protoFails;
}
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
