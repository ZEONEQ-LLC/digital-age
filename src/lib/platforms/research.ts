// KI-Plattformen pruefen (Task platform_research, PR 197). Pure: Prompt-Bau,
// Parser und Regeln, ohne DB. Job: platforms/job.ts. Test:
// platforms/__tests__/research.manual.ts.

export const PLATFORM_CATEGORIES = ["LLM", "Image", "Video", "Audio", "Code", "Search"] as const;
export const PLATFORM_HOSTINGS = ["CH", "EU", "US"] as const;
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
  "AUFTRAG:",
  "  - Prüfe mit der Websuche jede aktive Plattform: Gibt es sie noch, stimmen Link, Preismodell und Hosting-Region?",
  "  - Korrigiere nur, was du mit einer aktuellen, verlässlichen Quelle belegen kannst (offizielle Website, Preisseite, seriöse Fachpresse).",
  "  - Schlage höchstens drei neue Plattformen vor, die im Verzeichnis fehlen und für das Publikum wirklich relevant sind. Bevorzuge Anbieter aus der Schweiz und der EU, wenn sie gleichwertig sind.",
  "  - Archiviere eine Plattform nur, wenn sie eingestellt oder in einem anderen Produkt aufgegangen ist.",
  "  - Lieber nichts ändern als raten. Keine Marketingsprache.",
  "",
  "TEXTREGELN:",
  "  - tagline: ein Satz auf Deutsch, höchstens 120 Zeichen, sachlich, sagt, wofür man das Werkzeug nutzt.",
  "  - pricing: kurz, z. B. «Gratis + Pro», «Bezahlt», «Enterprise», «Gratis / Open Source», höchstens 30 Zeichen.",
  "  - hosting: CH, EU oder US, je nach Sitz bzw. Datenverarbeitung des Anbieters.",
].join("\n");

const LANGUAGE_LINE =
  "SPRACHE: Deutsch mit Schweizer Rechtschreibung (de-CH). IMMER 'ss' statt Eszett. NIEMALS Eszett verwenden.";

const OUTPUT_FORMAT = [
  "AUSGABEFORMAT: Antworte am Ende ausschliesslich mit einem JSON-Objekt, ohne Code-Block:",
  '{"updates": [{"slug": "…", "fields": {"tagline"?: "…", "pricing"?: "…", "hosting"?: "CH|EU|US", "url"?: "https://…", "category"?: "…", "name"?: "…"}, "reason": "…", "sources": ["https://…"]}],',
  ' "additions": [{"name": "…", "category": "LLM|Image|Video|Audio|Code|Search", "tagline": "…", "hosting": "CH|EU|US", "pricing": "…", "url": "https://…", "reason": "…", "sources": ["https://…"]}],',
  ' "archive": [{"slug": "…", "reason": "…", "sources": ["https://…"]}],',
  ' "checked": ["slug", "…"]}',
  "checked: alle Plattformen, die du geprüft hast und die stimmen. Jede Änderung braucht mindestens eine Quelle.",
].join("\n");

export function buildResearchPrompt(platforms: PlatformForResearch[], strategy: string = PLATFORM_RESEARCH_STRATEGY): { system: string; prompt: string } {
  const system = [LANGUAGE_LINE, strategy.trim(), OUTPUT_FORMAT].join("\n\n");
  const lines = platforms.map((p) =>
    `- ${p.slug} | ${p.name} | ${p.category} | ${p.hosting} | ${p.pricing} | ${p.url ?? "(kein Link)"} | ${p.status}${p.locked ? " | GESPERRT (nicht ändern)" : ""} | ${p.tagline}`,
  );
  const prompt = [
    `Heutiges Datum: ${new Date().toISOString().slice(0, 10)}.`,
    `Erlaubte Kategorien: ${PLATFORM_CATEGORIES.join(", ")}.`,
    "Aktueller Bestand (slug | Name | Kategorie | Hosting | Preis | Link | Status | Tagline):",
    ...lines,
  ].join("\n");
  return { system, prompt };
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
