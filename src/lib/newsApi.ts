import "server-only";

import { plausiblePublishedAt, type NewsItem } from "@/lib/newsFormat";
import { readAssessment, readImportance } from "@/lib/newsTicker/assessment";
import { createPublicClient } from "@/lib/supabase/public";

export { NEWS_CATEGORY_LABEL, newsClock, newsDayDate, newsDayLabel, zurichDay, type NewsItem } from "@/lib/newsFormat";

// Oeffentliche News (Ticker-Eintraege, status approved) fuer die Startseite
// und /news. Die Texte sind KI-Kurzfassungen externer Meldungen
// (newsTicker/generator.ts); verlinkt wird immer auf die Quelle.


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
  assessment: unknown;
  importance: number | null;
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
    publishedAt: plausiblePublishedAt(r.published_at, r.generated_at),
    assessment: readAssessment(r.assessment),
    importance: readImportance(r.importance),
  };
}

export async function getLatestNews(limit: number): Promise<NewsItem[]> {
  const { data, error } = await createPublicClient()
    .from("news_items")
    .select("id, title, teaser, summary, category, source_name, source_url, published_at, generated_at, assessment, importance")
    .eq("status", "approved")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    console.error("[news] latest failed:", error.message);
    return [];
  }
  // Nach der Korrektur zukuenftiger Daten neu sortieren.
  return ((data ?? []) as Row[]).map(toItem).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
