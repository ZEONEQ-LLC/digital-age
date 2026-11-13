import type { NewsItem } from "@/lib/newsFormat";
import { zurichDay } from "@/lib/newsFormat";
import { ASSESSMENT_DIMENSIONS, type AssessmentKey } from "@/lib/newsTicker/assessment";

// Filter fuer /news (Wunsch Ali 13.11.2026, PR 202; Suche seit PR 204). Rein,
// damit Liste und Test dieselbe Logik nutzen. Der Zustand steht in der URL
// (?zeit=7&bereich=wirtschaft,gesellschaft&relevanz=wichtig&rubrik=ki-business&q=nvidia),
// damit gefilterte Ansichten teilbar sind.

export const ZEIT_OPTIONS = [
  { key: "alle", label: "Alle" },
  { key: "heute", label: "Heute" },
  { key: "gestern", label: "Gestern" },
  { key: "7", label: "Letzte 7 Tage" },
] as const;
export type Zeit = (typeof ZEIT_OPTIONS)[number]["key"];

export const RELEVANZ_OPTIONS = [
  { key: "alle", label: "Alle" },
  { key: "relevant", label: "Relevant" },
  { key: "wichtig", label: "Wichtig" },
] as const;
export type Relevanz = (typeof RELEVANZ_OPTIONS)[number]["key"];

export type NewsFilters = {
  zeit: Zeit;
  bereiche: AssessmentKey[];
  relevanz: Relevanz;
  rubrik: string | null;
  q: string;              // Suchtext, leer = keine Suche
};

export const NO_FILTERS: NewsFilters = { zeit: "alle", bereiche: [], relevanz: "alle", rubrik: null, q: "" };

export const SEARCH_MAX = 80;

const ZEIT_KEYS = ZEIT_OPTIONS.map((o) => o.key) as readonly string[];
const RELEVANZ_KEYS = RELEVANZ_OPTIONS.map((o) => o.key) as readonly string[];
const BEREICH_KEYS = ASSESSMENT_DIMENSIONS.map((d) => d.key) as readonly string[];

export function parseFilters(search: string): NewsFilters {
  const q = new URLSearchParams(search);
  const zeit = q.get("zeit") ?? "";
  const relevanz = q.get("relevanz") ?? "";
  const bereiche = (q.get("bereich") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s, i, a) => BEREICH_KEYS.includes(s) && a.indexOf(s) === i) as AssessmentKey[];
  const rubrik = (q.get("rubrik") ?? "").trim();
  return {
    zeit: ZEIT_KEYS.includes(zeit) ? (zeit as Zeit) : "alle",
    bereiche,
    relevanz: RELEVANZ_KEYS.includes(relevanz) ? (relevanz as Relevanz) : "alle",
    rubrik: /^[a-z0-9-]{1,40}$/.test(rubrik) ? rubrik : null,
    q: (q.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX),
  };
}

// Nur gesetzte Filter in die URL, in fester Reihenfolge.
export function filtersToSearch(f: NewsFilters): string {
  const q = new URLSearchParams();
  if (f.zeit !== "alle") q.set("zeit", f.zeit);
  if (f.bereiche.length > 0) q.set("bereich", f.bereiche.join(","));
  if (f.relevanz !== "alle") q.set("relevanz", f.relevanz);
  if (f.rubrik) q.set("rubrik", f.rubrik);
  if (f.q.trim()) q.set("q", f.q.trim());
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function isFiltered(f: NewsFilters): boolean {
  return f.zeit !== "alle" || f.bereiche.length > 0 || f.relevanz !== "alle" || f.rubrik !== null || f.q.trim() !== "";
}

// Zahl der gesetzten Filter ohne Suche (fuer den Knopf «Filter · 2» mobil).
export function activeFilterCount(f: NewsFilters): number {
  return (f.zeit !== "alle" ? 1 : 0) + f.bereiche.length + (f.relevanz !== "alle" ? 1 : 0) + (f.rubrik ? 1 : 0);
}

// Fuer die Suche: klein, ohne Akzente, ss statt Eszett («Zürich» = «zurich»).
export function foldSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss");
}

// Durchsuchter Text pro Meldung, einmal berechnet.
const haystacks = new WeakMap<NewsItem, string>();
function haystack(it: NewsItem): string {
  let h = haystacks.get(it);
  if (h === undefined) {
    h = foldSearch([it.title, it.summary, it.teaser, it.sourceName, it.assessment?.warum ?? "", it.assessment?.kehrseite ?? ""].join(" "));
    haystacks.set(it, h);
  }
  return h;
}

// Alle Woerter muessen vorkommen (und-verknuepft), Teilwoerter zaehlen.
export function matchesSearch(it: NewsItem, q: string): boolean {
  const words = foldSearch(q).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const h = haystack(it);
  return words.every((w) => h.includes(w));
}

// Trifft die Meldung alle Filter? Bereiche: mindestens «mittel» in einem der
// gewaehlten Felder (oder-verknuepft).
export function matchesFilters(it: NewsItem, f: NewsFilters, now: Date): boolean {
  if (f.zeit !== "alle") {
    const day = zurichDay(it.publishedAt);
    if (f.zeit === "heute" && day !== zurichDay(now.toISOString())) return false;
    if (f.zeit === "gestern" && day !== zurichDay(new Date(now.getTime() - 86_400_000).toISOString())) return false;
    if (f.zeit === "7" && now.getTime() - new Date(it.publishedAt).getTime() > 7 * 86_400_000) return false;
  }
  if (f.bereiche.length > 0) {
    const a = it.assessment;
    if (!a || !f.bereiche.some((k) => a[k] >= 2)) return false;
  }
  if (f.relevanz !== "alle") {
    const imp = it.importance ?? 0;
    if (f.relevanz === "wichtig" && imp < 3) return false;
    if (f.relevanz === "relevant" && imp < 2) return false;
  }
  if (f.rubrik && it.category !== f.rubrik) return false;
  if (f.q && !matchesSearch(it, f.q)) return false;
  return true;
}

// Zahl der Treffer mit geaenderter Option, z. B. {bereiche: ["wirtschaft"]}
// fuer die Zahl am Chip «Wirtschaft» (uebrige Filter bleiben).
export function countWith(items: NewsItem[], f: NewsFilters, now: Date, patch: Partial<NewsFilters>): number {
  const next = { ...f, ...patch };
  return items.filter((it) => matchesFilters(it, next, now)).length;
}
