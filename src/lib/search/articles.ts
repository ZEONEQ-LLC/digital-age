import "server-only";

import { contentTypeLabel } from "@/lib/contentType";
import { createPublicClient } from "@/lib/supabase/public";
import { RELATIONS_SHORT, type ArticleWithRelations } from "@/lib/articleApi";

// Volltextsuche ueber publizierte Artikel (RPC search_articles, Postgres-FTS,
// Migration 20261111230000). Anon-Client: nur oeffentliche Inhalte.

// `sender` ist nur bei Unternehmensbeitraegen gesetzt: Kennzeichnung und Name
// des Unternehmens fuer die Trefferzeile.
export type ArticleHit = {
  article: ArticleWithRelations;
  snippet: string;
  sender: { label: string; name: string } | null;
};

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

  // Redaktionelle Artikel und Unternehmensbeitraege (seit S2b). Letztere
  // erscheinen gekennzeichnet und verlinken auf /showcase/<slug>. Ist das
  // Unternehmen fuer anon nicht lesbar (archiviert), faellt der Treffer weg:
  // Ohne Absender gibt es keine Kennzeichnung und keine Seite.
  const { data: rows, error: rowsErr } = await supabase
    .from("articles")
    .select(`${RELATIONS_SHORT}, startup:ai_startups(name)`)
    .eq("status", "published")
    .in("id", ranked.map((r) => r.id));
  if (rowsErr) {
    console.error("[search] article rows failed:", rowsErr.message);
    return { hits: [], failed: true };
  }
  type Row = ArticleWithRelations & { startup: { name: string } | null };
  const byId = new Map(((rows as Row[] | null) ?? []).map((a) => [a.id, a]));
  // Reihenfolge der RPC (Rang) behalten.
  const hits = ranked.flatMap((r): ArticleHit[] => {
    const article = byId.get(r.id);
    if (!article) return [];
    const label = contentTypeLabel(article);
    if (!label) return [{ article, snippet: r.snippet, sender: null }];
    if (!article.startup) return [];
    return [{ article, snippet: r.snippet, sender: { label, name: article.startup.name } }];
  });
  return { hits, failed: false };
}
