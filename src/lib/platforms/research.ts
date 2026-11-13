// KI-Plattformen pruefen (Task platform_research, PR 197; seit PR 206 aus
// festen Quellen statt Websuche). Pure: Prompt-Bau, Parser und Regeln, ohne
// DB. Job: platforms/job.ts, Quellen: platforms/sources.ts. Test:
// platforms/__tests__/research.manual.ts.
//
// Drei kurze KI-Aufgaben (Haiku), jeweils nur bei Bedarf:
//   1. Preisseite lesen, wenn sich ihre Preisangaben geaendert haben
//      (buildPageCheckPrompt / parsePageCheck),
//   2. neue App-Store-Apps einordnen: KI-Werkzeug ja/nein
//      (buildAppFilterPrompt / parseAppFilter),
//   3. Eintraege fuer neue Plattformen schreiben (buildAdditionPrompt /
//      parseAdditions; Link prueft der Job danach per Abruf).

export const PLATFORM_CATEGORIES = ["LLM", "Image", "Video", "Audio", "Code", "Search"] as const;
// CN seit PR 206 (Entscheid Ali 13.11.2026: chinesische Plattformen aufnehmen,
// gekennzeichnet).
export const PLATFORM_HOSTINGS = ["CH", "EU", "US", "CN"] as const;
export type PlatformCategory = (typeof PLATFORM_CATEGORIES)[number];
export type PlatformHosting = (typeof PLATFORM_HOSTINGS)[number];

export type PlatformFields = {
  name: string;
  category: PlatformCategory;
  tagline: string;
  hosting: PlatformHosting;
  pricing: string;
  url: string | null;
};

export type PlatformForResearch = PlatformFields & { slug: string; status: string; locked: boolean };

export type ResearchUpdate = { slug: string; fields: Partial<PlatformFields>; reason: string; sources: string[] };
export type ResearchAddition = PlatformFields & { reason: string; sources: string[] };
export type ResearchArchive = { slug: string; reason: string; sources: string[] };
export type ResearchResult = {
  updates: ResearchUpdate[];
  additions: ResearchAddition[];
  archive: ResearchArchive[];
  checked: string[];
};

// Obergrenzen pro Lauf: Die KI aendert ohne Freigabe, darum klein halten.
export const MAX_UPDATES = 6;
export const MAX_ADDITIONS = 3;
export const MAX_ARCHIVE = 2;

export const PLATFORM_RESEARCH_STRATEGY = [
  "Du pflegst das Verzeichnis «KI-Plattformen» von digital-age, einem Schweizer Magazin für KI und Future Tech.",
  "Leserinnen und Leser sind Fach- und Führungskräfte aus der Schweiz, Deutschland und Österreich, die Werkzeuge für den Arbeitsalltag suchen.",
  "",
  "GRUNDSATZ:",
  "  - Du arbeitest nur mit dem Material, das du bekommst (Text der offiziellen Seite, Angaben aus App-Store-Charts und Ranglisten). Was dort nicht steht, behauptest du nicht.",
  "  - Lieber nichts ändern als raten. Keine Marketingsprache.",
  "",
  "TEXTREGELN:",
  "  - tagline: ein Satz auf Deutsch, höchstens 120 Zeichen, sachlich, sagt, wofür man das Werkzeug nutzt.",
  "  - pricing: kurz, z. B. «Gratis + Pro», «Bezahlt», «Enterprise», «Gratis / Open Source», höchstens 30 Zeichen.",
  "  - hosting: CH, EU, US oder CN, je nach Sitz des Anbieters bzw. Ort der Datenverarbeitung. Chinesische Anbieter (z. B. Moonshot, DeepSeek, Alibaba, ByteDance) sind CN.",
].join("\n");

const LANGUAGE_LINE =
  "SPRACHE: Deutsch mit Schweizer Rechtschreibung (de-CH). IMMER 'ss' statt Eszett. NIEMALS Eszett verwenden.";

function system(strategy: string, task: string): string {
  return [LANGUAGE_LINE, strategy.trim(), task].join("\n\n");
}

// 1. Preisseite: nur Preis und «eingestellt», sonst nichts.
export function buildPageCheckPrompt(
  p: PlatformForResearch,
  pageUrl: string,
  digest: string,
  strategy: string = PLATFORM_RESEARCH_STRATEGY,
): { system: string; prompt: string } {
  const task = [
    "AUFGABE: Prüfe anhand des Auszugs der offiziellen Preisseite, ob das Preismodell im Verzeichnis noch stimmt und ob das Produkt eingestellt ist.",
    "AUSGABEFORMAT: ausschliesslich JSON, ohne Code-Block:",
    '{"pricing": "…" | null, "discontinued": false, "reason": "…"}',
    "pricing nur setzen, wenn der Eintrag nicht mehr stimmt, sonst null. discontinued nur true, wenn die Seite ausdrücklich sagt, dass das Produkt eingestellt ist. reason: ein Satz, worauf du dich stützt.",
  ].join("\n");
  const prompt = [
    `Eintrag: ${p.name} (${p.category}), Preis im Verzeichnis: «${p.pricing}».`,
    `Quelle: ${pageUrl}`,
    "Auszug der Seite (Zeilen mit Preisangaben):",
    digest || "(kein Auszug)",
  ].join("\n");
  return { system: system(strategy, task), prompt };
}

// 2. App-Store-Apps: Welche sind KI-Werkzeuge fuers Verzeichnis?
export function buildAppFilterPrompt(apps: { key: string; label: string; hint: string }[]): { system: string; prompt: string } {
  const sys = [
    LANGUAGE_LINE,
    "Du hilfst, das Verzeichnis «KI-Plattformen» von digital-age aktuell zu halten.",
    `Gesucht sind Apps, deren Kern generative KI oder ein KI-Assistent ist und die in eine dieser Kategorien passen: ${PLATFORM_CATEGORIES.join(", ")}.`,
    "Nicht gesucht: Spiele, Shopping, Banking, soziale Netzwerke, Messenger, Streaming und Apps, die KI nur als Nebenfunktion haben (z. B. Fotobearbeitung mit einem KI-Filter).",
    "AUSGABEFORMAT: ausschliesslich JSON, ohne Code-Block:",
    '{"ai": [{"key": "apple:…", "category": "LLM|Image|Video|Audio|Code|Search"}]}',
    "Nur Apps aus der Liste, nur mit ihrem key. Im Zweifel weglassen.",
  ].join("\n");
  const prompt = ["Apps aus den App-Store-Charts (key | Name | Angaben):", ...apps.map((a) => `${a.key} | ${a.label} | ${a.hint}`)].join("\n");
  return { system: sys, prompt };
}

export function parseAppFilter(raw: string, keys: readonly string[]): { key: string; category: PlatformCategory }[] | null {
  let parsed: unknown;
  try { parsed = JSON.parse(stripCodeFence(raw)); } catch { return null; }
  const list = (parsed as { ai?: unknown })?.ai;
  if (!Array.isArray(list)) return null;
  const known = new Set(keys);
  const out: { key: string; category: PlatformCategory }[] = [];
  for (const it of list) {
    if (!it || typeof it !== "object") continue;
    const r = it as Record<string, unknown>;
    const key = typeof r.key === "string" ? r.key.trim() : "";
    if (known.has(key) && isCategory(r.category) && !out.some((x) => x.key === key)) out.push({ key, category: r.category });
  }
  return out;
}

// 3. Neue Plattformen: Eintrag aus Wissen und Quelle; der Job prueft den Link.
export type AdditionCandidate = { key: string; label: string; hint: string; category: PlatformCategory | null };

export function buildAdditionPrompt(
  candidates: AdditionCandidate[],
  existingNames: string[],
  strategy: string = PLATFORM_RESEARCH_STRATEGY,
): { system: string; prompt: string } {
  const task = [
    "AUFGABE: Schreibe für jeden Kandidaten einen Eintrag für das Verzeichnis. Kandidaten sind Hersteller oder Apps, die in Ranglisten oder App-Store-Charts weit oben stehen.",
    "  - Nimm das Produkt, das Endkunden nutzen (z. B. Hersteller «moonshot» → «Kimi», Hersteller «xai» → «Grok»), mit seiner offiziellen Website.",
    "  - Ist das Produkt schon im Verzeichnis (andere Schreibweise) oder kein eigenständiges Werkzeug für Endkunden, lass den Kandidaten weg.",
    "  - Kennst du Website oder Preismodell nicht sicher, lass den Kandidaten weg.",
    "AUSGABEFORMAT: ausschliesslich JSON, ohne Code-Block:",
    '{"additions": [{"key": "<key des Kandidaten>", "name": "…", "category": "LLM|Image|Video|Audio|Code|Search", "tagline": "…", "hosting": "CH|EU|US|CN", "pricing": "…", "url": "https://…", "pricing_url": "https://…" | null, "reason": "…"}]}',
  ].join("\n");
  const prompt = [
    `Bereits im Verzeichnis: ${existingNames.join(", ") || "–"}.`,
    "Kandidaten (key | Name | Quelle | Kategorie-Hinweis):",
    ...candidates.map((c) => `${c.key} | ${c.label} | ${c.hint} | ${c.category ?? "–"}`),
  ].join("\n");
  return { system: system(strategy, task), prompt };
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/ß/g, "ss").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function httpsUrl(v: unknown): string | null {
  const s = str(v, 500);
  if (!/^https:\/\/[^\s/]+\.[^\s]+$/i.test(s)) return null;
  try { return new URL(s).toString().replace(/\/$/, ""); } catch { return null; }
}

function sources(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(httpsUrl).filter((u): u is string => !!u).slice(0, 5);
}

function isCategory(v: unknown): v is PlatformCategory {
  return typeof v === "string" && (PLATFORM_CATEGORIES as readonly string[]).includes(v);
}

function isHosting(v: unknown): v is PlatformHosting {
  return typeof v === "string" && (PLATFORM_HOSTINGS as readonly string[]).includes(v);
}

export function slugifyPlatform(name: string): string {
  return name
    .toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "plattform";
}

function host(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

function stripCodeFence(raw: string): string {
  const t = raw.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  // Text vor/nach dem JSON (Websuche): ab dem «{» vor "updates", sonst
  // erstes «{» bis letztes «}».
  const key = t.search(/"(updates|additions|checked)"\s*:/);
  const a = key > 0 ? t.lastIndexOf("{", key) : t.indexOf("{");
  const b = t.lastIndexOf("}");
  return a >= 0 && b > a ? t.slice(a, b + 1) : t;
}

// Validiert die KI-Antwort gegen den Bestand. Gesperrte und unbekannte
// Eintraege, Aenderungen ohne Quelle, Dubletten und alles ueber den
// Obergrenzen fallen weg.
export function parseResearch(raw: string, current: PlatformForResearch[]): ResearchResult | null {
  let parsed: unknown;
  try { parsed = JSON.parse(stripCodeFence(raw)); } catch { return null; }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const bySlug = new Map(current.map((p) => [p.slug, p]));
  const editable = (slug: string) => { const p = bySlug.get(slug); return p && !p.locked ? p : null; };

  const updates: ResearchUpdate[] = [];
  for (const u of Array.isArray(o.updates) ? o.updates : []) {
    if (!u || typeof u !== "object" || updates.length >= MAX_UPDATES) continue;
    const r = u as Record<string, unknown>;
    const p = editable(str(r.slug, 60));
    const src = sources(r.sources);
    if (!p || p.status !== "active" || src.length === 0) continue;
    const f = (r.fields && typeof r.fields === "object" ? r.fields : {}) as Record<string, unknown>;
    const fields: Partial<PlatformFields> = {};
    const name = str(f.name, 60); if (name && name !== p.name) fields.name = name;
    const tagline = str(f.tagline, 160); if (tagline && tagline !== p.tagline) fields.tagline = tagline;
    const pricing = str(f.pricing, 40); if (pricing && pricing !== p.pricing) fields.pricing = pricing;
    if (isHosting(f.hosting) && f.hosting !== p.hosting) fields.hosting = f.hosting;
    if (isCategory(f.category) && f.category !== p.category) fields.category = f.category;
    const url = httpsUrl(f.url); if (url && url !== httpsUrl(p.url)) fields.url = url;
    if (Object.keys(fields).length === 0) continue;
    updates.push({ slug: p.slug, fields, reason: str(r.reason, 300), sources: src });
  }

  const knownNames = new Set(current.map((p) => p.name.toLowerCase()));
  const knownHosts = new Set(current.map((p) => host(p.url)).filter((h): h is string => !!h));
  const knownSlugs = new Set(current.map((p) => p.slug));
  const additions: ResearchAddition[] = [];
  for (const a of Array.isArray(o.additions) ? o.additions : []) {
    if (!a || typeof a !== "object" || additions.length >= MAX_ADDITIONS) continue;
    const r = a as Record<string, unknown>;
    const name = str(r.name, 60);
    const url = httpsUrl(r.url);
    const src = sources(r.sources);
    const tagline = str(r.tagline, 160);
    const pricing = str(r.pricing, 40);
    if (!name || !url || src.length === 0 || !tagline || !pricing || !isCategory(r.category) || !isHosting(r.hosting)) continue;
    const h = host(url);
    const slug = slugifyPlatform(name);
    if (knownNames.has(name.toLowerCase()) || (h && knownHosts.has(h)) || knownSlugs.has(slug)) continue;
    knownNames.add(name.toLowerCase()); if (h) knownHosts.add(h); knownSlugs.add(slug);
    additions.push({ name, category: r.category, tagline, hosting: r.hosting, pricing, url, reason: str(r.reason, 300), sources: src });
  }

  const archive: ResearchArchive[] = [];
  const updated = new Set(updates.map((u) => u.slug));
  for (const a of Array.isArray(o.archive) ? o.archive : []) {
    if (!a || typeof a !== "object" || archive.length >= MAX_ARCHIVE) continue;
    const r = a as Record<string, unknown>;
    const p = editable(str(r.slug, 60));
    const src = sources(r.sources);
    if (!p || p.status !== "active" || src.length === 0 || updated.has(p.slug)) continue;
    archive.push({ slug: p.slug, reason: str(r.reason, 300), sources: src });
  }

  const checked = (Array.isArray(o.checked) ? o.checked : [])
    .map((s) => str(s, 60))
    .filter((s) => bySlug.has(s));
  return { updates, additions, archive, checked: Array.from(new Set(checked)) };
}

// Preisseite → Update/Archiv ueber parseResearch (gleiche Regeln: gesperrt,
// archiviert, Quelle Pflicht). Quelle ist die abgerufene Seite.
export function parsePageCheck(raw: string, p: PlatformForResearch, pageUrl: string): ResearchResult | null {
  let parsed: unknown;
  try { parsed = JSON.parse(stripCodeFence(raw)); } catch { return null; }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const reason = str(o.reason, 300);
  const pricing = str(o.pricing, 40);
  return parseResearch(JSON.stringify({
    updates: pricing ? [{ slug: p.slug, fields: { pricing }, reason, sources: [pageUrl] }] : [],
    archive: o.discontinued === true ? [{ slug: p.slug, reason, sources: [pageUrl] }] : [],
    checked: [p.slug],
  }), [p]);
}

export type ParsedAddition = ResearchAddition & { key: string; pricingUrl: string | null };

// Neue Eintraege: Pflichtfelder, Dubletten und Obergrenze wie parseResearch;
// key muss ein gelieferter Kandidat sein. Quelle = Liste, aus der er kam.
export function parseAdditions(
  raw: string,
  current: PlatformForResearch[],
  candidates: { key: string; sourceUrl: string }[],
): ParsedAddition[] | null {
  let parsed: unknown;
  try { parsed = JSON.parse(stripCodeFence(raw)); } catch { return null; }
  const list = (parsed as { additions?: unknown })?.additions;
  if (!Array.isArray(list)) return null;
  const byKey = new Map(candidates.map((c) => [c.key, c.sourceUrl]));
  const rows = list
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .filter((a) => typeof a.key === "string" && byKey.has(a.key));
  const checked = parseResearch(JSON.stringify({
    additions: rows.map((a) => ({ ...a, sources: [byKey.get(a.key as string)] })),
  }), current);
  if (!checked) return null;
  return checked.additions.map((add) => {
    const row = rows.find((r) => str(r.name, 60) === add.name);
    return { ...add, key: String(row?.key ?? ""), pricingUrl: httpsUrl(row?.pricing_url) };
  }).filter((a) => a.key);
}
