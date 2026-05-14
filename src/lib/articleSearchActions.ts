"use server";

import { createClient } from "@/lib/supabase/server";

export type ArticleSearchResult = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category_slug: string | null;
};

// Suche über published-Artikel (RLS gestattet anon-Read auf published, daher
// auch für nicht-eingeloggte Editoren-Sessions sicher). Wird vom Inline-
// Article-Link-Modal und vom InternalArticleCard-Block aufgerufen.
export async function searchPublishedArticles(
  query: string,
  options: { excludeId?: string; limit?: number } = {},
): Promise<ArticleSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const limit = Math.min(options.limit ?? 10, 25);

  let req = supabase
    .from("articles")
    .select("id, slug, title, excerpt, cover_image_url, category:categories(slug)")
    .eq("status", "published")
    .ilike("title", `%${q}%`)
    .limit(limit);

  if (options.excludeId) {
    req = req.neq("id", options.excludeId);
  }

  const { data, error } = await req;
  if (error) return [];

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover_image_url: row.cover_image_url,
    category_slug:
      Array.isArray(row.category)
        ? (row.category[0]?.slug ?? null)
        : (row.category as { slug: string } | null)?.slug ?? null,
  }));
}
