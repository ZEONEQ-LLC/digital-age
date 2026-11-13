// Feste Quellen fuer das Verzeichnis «KI-Plattformen» (Wunsch Ali 13.11.2026:
// eine verlaessliche Quelle statt Websuche, Kosten im Griff). Rein, ohne DB
// und ohne Netz: Parser fuer die Quellen, Text aus HTML, Preis-Auszug und
// Abgleich mit dem Bestand. Abruf in fetchSources.ts, Ablauf in job.ts.
// Test: __tests__/sources.manual.ts.
//
// Quellen (geprueft 13.11.2026):
//   * offizielle Preisseite jedes Eintrags (Updates),
//   * App-Store-Charts CH/DE/AT, Top 100 gratis (Nutzung in der DACH-Region),
//   * Arena-Ranglisten (lmarena-ai/leaderboard-dataset auf Hugging Face):
//     Text, Code (webdev), Bild, Video, Suche (Qualitaet aus Blindvergleichen),
//   * Artificial Analysis, freie Endpunkte fuer Sprachausgabe und Musik
//     (Audio; nur mit Schluessel ARTIFICIAL_ANALYSIS_API_KEY).

import { createHash } from "node:crypto";
import type { PlatformCategory } from "@/lib/platforms/research";

export type SourceCandidate = {
  key: string;            // stabil, z. B. «apple:6448311069», «arena:moonshot»
  source: "apple" | "arena" | "audio";
  label: string;          // App-Name bzw. Hersteller
  hint: string;           // Kontext fuer die KI, z. B. «App Store CH Platz 12, Entwickler OpenAI»
  names: string[];        // Namen fuer den Abgleich mit dem Bestand
  category: PlatformCategory | null;
  priority: number;       // kleiner = wichtiger
};

// ---------- Text aus HTML ----------

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", euro: "€", ndash: "–", mdash: "—" };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

// Sichtbarer Text, eine Zeile pro Block (Absatz, Listenpunkt, Zelle, Titel).
export function htmlToLines(html: string): string[] {
  const body = html
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/(p|div|li|tr|td|th|h[1-6]|section|article|header|footer|ul|ol|dt|dd|button|a|span|label)>/gi, (m) => (/(span|a|label)>$/i.test(m) ? " " : "\n"))
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(body)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);
}

export function textLength(lines: string[]): number {
  return lines.reduce((n, l) => n + l.length, 0);
}

// Zeilen mit Preisangaben: Waehrung, «/Monat», Planbezeichnungen. Daraus
// entsteht der Hash; aendert sich nur ein Cookie-Hinweis oder ein Datum,
// bleibt er gleich und es braucht keinen KI-Aufruf.
const PRICE_LINE = /(\$|€|£|chf|usd|eur)\s?\d|\d[\d'.,]*\s?(\$|€|£|chf|usd|eur)\b|\/\s?(mo|month|monat|jahr|year|user|nutzer)\b|\b(free|gratis|kostenlos|plus|pro|premium|team|teams|business|enterprise|max|ultra|starter|basic|standard)\b/i;

export const DIGEST_MAX = 6000;

export function priceDigest(lines: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  let len = 0;
  for (const l of lines) {
    if (l.length > 300 || !PRICE_LINE.test(l) || seen.has(l)) continue;
    seen.add(l);
    if (len + l.length + 1 > DIGEST_MAX) break;
    out.push(l);
    len += l.length + 1;
  }
  return out.join("\n");
}

export function digestHash(digest: string): string {
  return createHash("sha1").update(digest).digest("hex");
}

// ---------- Abgleich mit dem Bestand ----------

export function normalizeKey(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function host(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, "").split(".")[0]; } catch { return null; }
}

// Gilt ein Kandidat als schon im Verzeichnis? Ein Schluessel (Name, Hersteller,
// Domain) muss als ganzes Wort im Kandidatennamen vorkommen. Archivierte
// Eintraege zaehlen mit, damit ein zurueckgenommener Vorschlag nicht
// wiederkommt.
export function isCovered(
  names: string[],
  platforms: { name: string; url: string | null; source_keys: string[] | null }[],
): boolean {
  const hay = names.map((n) => ` ${normalizeKey(n)} `);
  for (const p of platforms) {
    const keys = [p.name, ...(p.source_keys ?? []), host(p.url) ?? ""].map(normalizeKey).filter((k) => k.length >= 3);
    if (keys.some((k) => hay.some((h) => h.includes(` ${k} `)))) return true;
  }
  return false;
}

// ---------- App Store (Apple RSS, Top 100 gratis) ----------

const GAME_GENRE = "6014";

export function parseAppleChart(json: unknown, country: string): SourceCandidate[] {
  const results = (json as { feed?: { results?: unknown[] } })?.feed?.results;
  if (!Array.isArray(results)) return [];
  const out: SourceCandidate[] = [];
  results.forEach((r, i) => {
    if (!r || typeof r !== "object") return;
    const o = r as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const dev = typeof o.artistName === "string" ? o.artistName.trim() : "";
    const genres = Array.isArray(o.genres) ? (o.genres as { genreId?: string; name?: string }[]) : [];
    if (!id || !name || genres.some((g) => g?.genreId === GAME_GENRE)) return;
    const genre = genres.map((g) => g?.name).filter(Boolean).join(", ");
    out.push({
      key: `apple:${id}`,
      source: "apple",
      label: name,
      hint: `App Store ${country.toUpperCase()} Platz ${i + 1}, Entwickler ${dev || "–"}${genre ? `, ${genre}` : ""}`,
      names: [name, dev],
      category: null,
      priority: i + 1,
    });
  });
  return out;
}

// Gleiche App in mehreren Laendern: bester Platz zaehlt, Hinweise zusammen.
export function mergeByKey(list: SourceCandidate[]): SourceCandidate[] {
  const map = new Map<string, SourceCandidate>();
  for (const c of list) {
    const prev = map.get(c.key);
    if (!prev) { map.set(c.key, { ...c }); continue; }
    prev.priority = Math.min(prev.priority, c.priority);
    prev.hint = `${prev.hint}; ${c.hint.replace(/, Entwickler.*$/, "")}`;
    if (!prev.category && c.category) prev.category = c.category;
  }
  return [...map.values()];
}

// ---------- Arena (Hugging Face datasets-server, «rows») ----------

export const ARENA_CATEGORIES: { config: string; category: PlatformCategory; label: string }[] = [
  { config: "text", category: "LLM", label: "Text" },
  { config: "webdev", category: "Code", label: "Web-Entwicklung" },
  { config: "text_to_image", category: "Image", label: "Bild" },
  { config: "text_to_video", category: "Video", label: "Video" },
  { config: "search", category: "Search", label: "Suche" },
];

export const ARENA_TOP = 10;
// Nur wer in der Gesamtwertung weit oben steht, wird Kandidat.
export const ARENA_MAX_RANK = 20;

export function parseArenaRows(json: unknown, config: string): SourceCandidate[] {
  const cat = ARENA_CATEGORIES.find((c) => c.config === config);
  const rows = (json as { rows?: { row?: Record<string, unknown> }[] })?.rows;
  if (!cat || !Array.isArray(rows)) return [];
  const ranked = rows
    .map((r) => r?.row ?? {})
    .filter((r) => (r.category ?? "overall") === "overall" && typeof r.organization === "string" && typeof r.rank === "number" && (r.rank as number) <= ARENA_MAX_RANK)
    .sort((a, b) => (a.rank as number) - (b.rank as number));
  const out: SourceCandidate[] = [];
  const seen = new Set<string>();
  for (const r of ranked) {
    const org = String(r.organization).trim();
    const k = normalizeKey(org);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push({
      key: `arena:${k.replace(/ /g, "-")}`,
      source: "arena",
      label: org,
      hint: `Arena-Rangliste ${cat.label} Platz ${r.rank as number} mit «${String(r.model_name ?? "")}» (Hersteller ${org})`,
      names: [org, String(r.model_name ?? "")],
      category: cat.category,
      priority: 1000 + (r.rank as number),
    });
    if (out.length >= ARENA_TOP) break;
  }
  return out;
}

// ---------- Artificial Analysis (Audio, freie Endpunkte) ----------

export const AUDIO_TOP = 8;

export function parseAudioRanking(json: unknown, label: string): SourceCandidate[] {
  const data = (json as { data?: unknown[] })?.data;
  if (!Array.isArray(data)) return [];
  const ranked = data
    .map((d) => (d && typeof d === "object" ? (d as Record<string, unknown>) : {}))
    .filter((d) => typeof d.elo === "number" && d.model_creator && typeof (d.model_creator as Record<string, unknown>).name === "string")
    .sort((a, b) => (b.elo as number) - (a.elo as number));
  const out: SourceCandidate[] = [];
  const seen = new Set<string>();
  ranked.forEach((d, i) => {
    const creator = String((d.model_creator as Record<string, unknown>).name).trim();
    const k = normalizeKey(creator);
    if (!k || seen.has(k) || out.length >= AUDIO_TOP) return;
    seen.add(k);
    out.push({
      key: `audio:${k.replace(/ /g, "-")}`,
      source: "audio",
      label: creator,
      hint: `Artificial Analysis ${label} Platz ${i + 1} mit «${String(d.name ?? "")}» (Hersteller ${creator})`,
      names: [creator, String(d.name ?? "")],
      category: "Audio",
      priority: 2000 + i + 1,
    });
  });
  return out;
}
