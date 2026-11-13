import type { Assessment, Importance } from "@/lib/newsTicker/assessment";

// Reine Helfer und Typen der News (ohne Datenbank), damit auch die
// Client-Liste auf /news (Filter, PR 202) sie nutzen kann. Geladen wird in
// newsApi.ts (server-only).

export type NewsItem = {
  id: string;
  title: string;
  teaser: string;
  summary: string;
  category: string | null;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  // KI-Einordnung (PR 199), null solange der Nachtrag noch fehlt.
  assessment: Assessment | null;
  importance: Importance | null;
};

export const NEWS_CATEGORY_LABEL: Record<string, string> = {
  "ki-business": "KI & Business",
  "future-tech": "Future Tech",
  "swiss-ai": "Swiss AI",
  tools: "Tools",
};

// Zuercher Kalendertag, z. B. «2026-11-12».
export function zurichDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" });
}

// Tagesueberschrift fuer /news: «Heute», «Gestern» oder «Montag, 10. November».
export function newsDayLabel(day: string, now: Date): string {
  const today = zurichDay(now.toISOString());
  const yesterday = zurichDay(new Date(now.getTime() - 86_400_000).toISOString());
  if (day === today) return "Heute";
  if (day === yesterday) return "Gestern";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Zurich" });
}

// Uhrzeit einer Meldung, «07:01» (Europe/Zurich).
export function newsClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
}

// Datum zur Tagesueberschrift: «Freitag, 13. November».
export function newsDayDate(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Zurich" });
}

// Manche Feeds datieren Meldungen in die Zukunft (Netzwoche: Ausgabedatum,
// z. B. 30.11. fuer eine Meldung vom 13.11.). Eine Meldung kann nicht nach
// dem Anlegen im Ticker erschienen sein; dann gilt generated_at.
export function plausiblePublishedAt(published: string | null, generated: string): string {
  if (!published) return generated;
  return new Date(published).getTime() > new Date(generated).getTime() ? generated : published;
}
