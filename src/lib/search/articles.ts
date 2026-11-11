import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import { RELATIONS_SHORT, type ArticleWithRelations } from "@/lib/articleApi";

// Volltextsuche ueber publizierte Artikel (RPC search_articles, Postgres-FTS,
// Migration 20261111230000). Anon-Client: nur oeffentliche Inhalte.

export type ArticleHit = { article: ArticleWithRelations; snippet: string };

export const SEARCH_LIMIT = 30;

export async function searchArticles(
  query: string,
): Promise<{ hits: ArticleHit[]; failed: boolean }> {
  if (query.trim() === "") return { hits: [], failed: false };
  const supabase = createPublicClient();
  const { data: ranked, error } = await supabase.rpc("search_articles", { p_query: query, p_limit: SEARCH_LIMIT });
  if (error) {
    console.error("[search] search_articles failed:", error.message);
    return { hits: [], failed: true };
  }
  if (!ranked || ranked.length === 0) return { hits: [], failed: false };

  const { data: rows, error: rowsErr } = await supabase
    .from("articles")
    .select(RELATIONS_SHORT)
    .eq("status", "published")
    .in("id", ranked.map((r) => r.id));
  if (rowsErr) {
    console.error("[search] article rows failed:", rowsErr.message);
    return { hits: [], failed: true };
  }
  const byId = new Map(((rows as ArticleWithRelations[] | null) ?? []).map((a) => [a.id, a]));
  // Reihenfolge der RPC (Rang) behalten.
  const hits = ranked.flatMap((r) => {
    const article = byId.get(r.id);
    return article ? [{ article, snippet: r.snippet }] : [];
  });
  return { hits, failed: false };
}
