// Lesestatistik, Auswertung: reine Logik fuer die Seiten unter
// /autor/statistiken. Rechnet mit den Summen aus article_stats_summary und
// dem Verlauf aus article_stats_series. Ohne Server-Importe.

import type { ReadSource } from "@/lib/stats/reading";

export type StatTotals = {
  views: number;
  reads: number;
  seconds: number;
  d25: number;
  d50: number;
  d75: number;
  d100: number;
  shares: number;
  listens: number;
  src_search: number;
  src_social: number;
  src_mail: number;
  src_ai: number;
  src_internal: number;
  src_direct: number;
  src_other: number;
};

export type ArticleStatRow = StatTotals & {
  article_id: string;
  first_day: string | null;
  last_day: string | null;
};

export type SeriesPoint = { bucket: string; views: number; reads: number; seconds: number };

export type Bucket = "day" | "week" | "month";

const TOTAL_KEYS: (keyof StatTotals)[] = [
  "views", "reads", "seconds", "d25", "d50", "d75", "d100", "shares", "listens",
  "src_search", "src_social", "src_mail", "src_ai", "src_internal", "src_direct", "src_other",
];

export function zeroTotals(): StatTotals {
  return {
    views: 0, reads: 0, seconds: 0, d25: 0, d50: 0, d75: 0, d100: 0, shares: 0, listens: 0,
    src_search: 0, src_social: 0, src_mail: 0, src_ai: 0, src_internal: 0, src_direct: 0, src_other: 0,
  };
}

// PostgREST liefert bigint je nach Groesse als Zahl oder Text.
function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function toTotals(row: Partial<Record<keyof StatTotals, unknown>>): StatTotals {
  const t = zeroTotals();
  for (const k of TOTAL_KEYS) t[k] = num(row[k]);
  return t;
}

export function sumTotals(rows: StatTotals[]): StatTotals {
  const t = zeroTotals();
  for (const r of rows) for (const k of TOTAL_KEYS) t[k] += r[k];
  return t;
}

// --- Kennzahlen -------------------------------------------------------------

// Anteil der Aufrufe, die bis zum Ende gelesen wurden. null ohne Aufrufe.
// Hoechstens 1: «gelesen» kann am Tag nach dem Aufruf gemeldet werden.
export function readRatio(t: Pick<StatTotals, "views" | "reads">): number | null {
  if (t.views <= 0) return null;
  return Math.min(1, t.reads / t.views);
}

// Aktive Lesezeit pro Aufruf in Sekunden. null ohne Aufrufe.
export function avgSeconds(t: Pick<StatTotals, "views" | "seconds">): number | null {
  if (t.views <= 0) return null;
  return t.seconds / t.views;
}

const NBSP = " ";

export function formatCount(n: number): string {
  return Math.round(n).toLocaleString("de-CH");
}

export function formatPercent(ratio: number | null): string {
  if (ratio === null) return "–";
  return `${Math.round(ratio * 100)}${NBSP}%`;
}

// «45 s», «3:20 min», «1:02 h». null = kein Wert.
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "–";
  const s = Math.round(seconds);
  if (s < 60) return `${s}${NBSP}s`;
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}${NBSP}min`;
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}${NBSP}h`;
}

// --- Herkunft ---------------------------------------------------------------

export const SOURCE_LABELS: Record<ReadSource, string> = {
  search: "Suchmaschinen",
  social: "Soziale Medien",
  mail: "E-Mail und Newsletter",
  ai: "KI-Assistenten",
  internal: "Innerhalb der Website",
  direct: "Direkt",
  other: "Andere Websites",
};

export const SOURCE_HINTS: Partial<Record<ReadSource, string>> = {
  direct: "Adresse eingetippt, Lesezeichen oder ein Link aus einer App (etwa WhatsApp oder ein Mailprogramm), die keinen Verweis mitgibt.",
  ai: "ChatGPT, Perplexity, Claude, Copilot, Gemini und ähnliche.",
  mail: "Webmail und Links mit Newsletter-Kennung. Mailprogramme auf dem Gerät zählen zu «Direkt».",
};

export type SourceLine = { key: ReadSource; label: string; count: number; share: number };

const SOURCE_KEYS: ReadSource[] = ["search", "social", "mail", "ai", "internal", "direct", "other"];

// Herkunft der Aufrufe, groesste zuerst, ohne leere Klassen. Der Anteil
// bezieht sich auf die Summe der Klassen (entspricht den Aufrufen).
export function sourceBreakdown(t: StatTotals): SourceLine[] {
  const lines = SOURCE_KEYS.map((key) => ({ key, label: SOURCE_LABELS[key], count: t[`src_${key}`] }));
  const total = lines.reduce((n, l) => n + l.count, 0);
  if (total <= 0) return [];
  return lines
    .filter((l) => l.count > 0)
    .map((l) => ({ ...l, share: l.count / total }))
    .sort((a, b) => b.count - a.count || SOURCE_KEYS.indexOf(a.key) - SOURCE_KEYS.indexOf(b.key));
}

// --- Lesetiefe --------------------------------------------------------------

export type DepthLine = { key: "open" | "d25" | "d50" | "d75" | "d100"; label: string; count: number; share: number };

// Von allen Aufrufen: wie viele welche Stelle im Text erreicht haben. Die
// Werte fallen nie wieder an (eine spaetere Marke kann nicht haeufiger sein
// als eine fruehere) und liegen nie ueber den Aufrufen.
export function depthFunnel(t: StatTotals): DepthLine[] {
  if (t.views <= 0) return [];
  const steps: { key: DepthLine["key"]; label: string; raw: number }[] = [
    { key: "open", label: "Geöffnet", raw: t.views },
    { key: "d25", label: "Ein Viertel", raw: t.d25 },
    { key: "d50", label: "Die Hälfte", raw: t.d50 },
    { key: "d75", label: "Drei Viertel", raw: t.d75 },
    { key: "d100", label: "Bis zum Ende", raw: t.d100 },
  ];
  let ceiling = t.views;
  return steps.map((s) => {
    const count = Math.min(s.raw, ceiling);
    ceiling = count;
    return { key: s.key, label: s.label, count, share: count / t.views };
  });
}

// --- Zeitraum ---------------------------------------------------------------

export const RANGES = [
  { key: "7", label: "7 Tage", days: 7 },
  { key: "30", label: "30 Tage", days: 30 },
  { key: "90", label: "90 Tage", days: 90 },
  { key: "365", label: "12 Monate", days: 365 },
  { key: "alle", label: "Gesamt", days: null },
] as const;

export type RangeKey = (typeof RANGES)[number]["key"];

export const DEFAULT_RANGE: RangeKey = "30";

export function parseRange(param: string | string[] | undefined): RangeKey {
  const v = Array.isArray(param) ? param[0] : param;
  return RANGES.some((r) => r.key === v) ? (v as RangeKey) : DEFAULT_RANGE;
}

export function rangeLabel(key: RangeKey): string {
  return RANGES.find((r) => r.key === key)?.label ?? "";
}

// Kalendertag in Zuerich (so zaehlt die Datenbank).
export function zurichToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

export function daysBetween(fromIso: string, toIsoDate: string): number {
  return Math.round((parseIso(toIsoDate).getTime() - parseIso(fromIso).getTime()) / 86_400_000);
}

// Raster des Verlaufs nach Laenge: bis drei Monate Tage, bis zwei Jahre
// Wochen, darueber Monate.
export function bucketForSpan(days: number): Bucket {
  if (days <= 92) return "day";
  if (days <= 750) return "week";
  return "month";
}

// Fenster eines Zeitraums. from = null heisst «von Anfang an»; dann bestimmt
// der erste Tag mit Daten das Raster (resolveWindow).
export function rangeWindow(key: RangeKey, today: string): { from: string | null; to: string } {
  const days = RANGES.find((r) => r.key === key)?.days ?? null;
  return { from: days === null ? null : addDays(today, -(days - 1)), to: today };
}

export function resolveWindow(
  key: RangeKey,
  today: string,
  firstDay: string | null,
): { from: string; to: string; bucket: Bucket } {
  const w = rangeWindow(key, today);
  // «Gesamt» ohne Daten: die letzten 30 Tage zeigen, damit die Achse steht.
  const from = w.from ?? firstDay ?? addDays(today, -29);
  return { from, to: w.to, bucket: bucketForSpan(daysBetween(from, w.to) + 1) };
}

// Beginn des Rasterfelds, in dem der Tag liegt (Woche ab Montag, wie
// date_trunc in Postgres).
export function bucketStart(iso: string, bucket: Bucket): string {
  if (bucket === "day") return iso;
  const d = parseIso(iso);
  if (bucket === "month") {
    d.setUTCDate(1);
    return toIso(d);
  }
  const dow = (d.getUTCDay() + 6) % 7; // Montag = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return toIso(d);
}

function nextBucket(iso: string, bucket: Bucket): string {
  if (bucket === "day") return addDays(iso, 1);
  if (bucket === "week") return addDays(iso, 7);
  const d = parseIso(iso);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return toIso(d);
}

// Verlauf lueckenlos: Felder ohne Aufrufe stehen mit 0 da.
export function fillSeries(points: SeriesPoint[], from: string, to: string, bucket: Bucket): SeriesPoint[] {
  const byBucket = new Map(points.map((p) => [p.bucket, p]));
  const out: SeriesPoint[] = [];
  let cur = bucketStart(from, bucket);
  const end = bucketStart(to, bucket);
  // Obergrenze gegen Endlosschleifen bei kaputten Eingaben.
  for (let i = 0; i < 2000 && cur <= end; i++) {
    const p = byBucket.get(cur);
    out.push({ bucket: cur, views: num(p?.views), reads: num(p?.reads), seconds: num(p?.seconds) });
    cur = nextBucket(cur, bucket);
  }
  return out;
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONTHS_SHORT = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];

function dayMonth(d: Date): string {
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
}

// Beschriftung eines Feldes im Tooltip: «Mo, 16.11.2026», «Woche vom
// 16.11.2026», «November 2026».
export function bucketLabel(iso: string, bucket: Bucket): string {
  const d = parseIso(iso);
  if (bucket === "month") return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const date = `${dayMonth(d)}${d.getUTCFullYear()}`;
  return bucket === "week" ? `Woche vom ${date}` : `${WEEKDAYS[d.getUTCDay()]}, ${date}`;
}

// Kurze Beschriftung an der Achse: «16.11.», «Nov. 26».
export function bucketTick(iso: string, bucket: Bucket): string {
  const d = parseIso(iso);
  if (bucket === "month") return `${MONTHS_SHORT[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
  return dayMonth(d);
}

// Welche Felder an der Achse beschriftet werden: das erste, das letzte und
// gleichmaessig dazwischen, hoechstens `max`.
export function tickIndexes(count: number, max = 6): number[] {
  if (count <= 0) return [];
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const out = new Set<number>();
  for (let i = 0; i < max; i++) out.add(Math.round((i * (count - 1)) / (max - 1)));
  return [...out].sort((a, b) => a - b);
}

// Runde Achsenwerte von 0 bis ueber das Maximum: 0, 5, 10 oder 0, 200, 400.
export function niceTicks(max: number, steps = 3): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / steps;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const unit = [1, 2, 5, 10].find((u) => u * pow >= rough) ?? 10;
  const step = Math.max(1, unit * pow);
  const ticks: number[] = [];
  for (let v = 0; v < max + step; v += step) ticks.push(v);
  return ticks;
}

export function formatDayCH(iso: string | null): string {
  if (!iso) return "";
  const d = parseIso(iso.slice(0, 10));
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
}

// --- Beitraege --------------------------------------------------------------

export type StatsArticle = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  author_id: string | null;
  author_name: string | null;
  content_type: string;
};

export type ArticleLine = StatsArticle & {
  totals: StatTotals;
  ratio: number | null;
  avg: number | null;
};

// Zeilen der Tabelle: veroeffentlichte Beitraege und solche mit Zahlen im
// Zeitraum (etwa inzwischen archivierte). Meistgeoeffnete zuerst, bei
// Gleichstand der neuere.
export function buildArticleLines(articles: StatsArticle[], rows: ArticleStatRow[]): ArticleLine[] {
  const byId = new Map(rows.map((r) => [r.article_id, r]));
  return articles
    .filter((a) => a.status === "published" || byId.has(a.id))
    .map((a) => {
      const totals = byId.has(a.id) ? toTotals(byId.get(a.id)!) : zeroTotals();
      return { ...a, totals, ratio: readRatio(totals), avg: avgSeconds(totals) };
    })
    .sort(
      (a, b) =>
        b.totals.views - a.totals.views ||
        (b.published_at ?? "").localeCompare(a.published_at ?? "") ||
        a.title.localeCompare(b.title, "de"),
    );
}
