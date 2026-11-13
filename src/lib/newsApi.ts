import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

// Oeffentliche News (Ticker-Eintraege, status approved) fuer die Startseite
// und /news. Die Texte sind KI-Kurzfassungen externer Meldungen
// (newsTicker/generator.ts); verlinkt wird immer auf die Quelle.

export type NewsItem = {
  id: string;
  title: string;
  teaser: string;
  summary: string;
  category: string | null;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
};

export const NEWS_CATEGORY_LABEL: Record<string, string> = {
  "ki-business": "KI & Business",
  "future-tech": "Future Tech",
  "swiss-ai": "Swiss AI",
  tools: "Tools",
};

type Row = {
  id: string;
  title: string;
  teaser: string;
  summary: string;
  category: string | null;
  source_name: string | null;
  source_url: string;
  published_at: string | null;
  generated_at: string;
};

function toItem(r: Row): NewsItem {
  return {
    id: r.id,
    title: r.title,
    teaser: r.teaser,
    summary: r.summary,
    category: r.category,
    sourceName: r.source_name ?? "Externe Quelle",
    sourceUrl: r.source_url,
    publishedAt: r.published_at ?? r.generated_at,
  };
}

export async function getLatestNews(limit: number): Promise<NewsItem[]> {
  const { data, error } = await createPublicClient()
    .from("news_items")
    .select("id, title, teaser, summary, category, source_name, source_url, published_at, generated_at")
    .eq("status", "approved")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    console.error("[news] latest failed:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(toItem);
}

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

