import { createClient } from "@/lib/supabase/server";
import type { ArticleWithRelations } from "@/lib/articleApi";

export type Tag = {
  id: string;
  slug: string;
  name: string;
};

export type TopTag = Tag & { article_count: number };

export async function getAllTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tags")
    .select("id, slug, name")
    .order("name");
  return data ?? [];
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tags")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  return data ?? null;
}

// Top-N Tags global, all-time, nur published Articles. Sortierung intern:
// count DESC, dann name ASC. Limit-Default ist 5 (passt zur Spec).
export async function getTopTags(limit = 5): Promise<TopTag[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_top_tags", { limit_count: limit });
  return (data as TopTag[] | null) ?? [];
}

// Artikel zu einem Tag laden — chronologisch DESC. Verwendet die
// article_tags-Junction zur Filterung und joined dieselben Relations
// wie getArticlesByCategory, damit `articleToListRow` direkt funktioniert.
export async function getArticlesByTagSlug(
  tagSlug: string,
  limit = 20,
): Promise<ArticleWithRelations[]> {
  const supabase = await createClient();

  // Zwei-Step-Query: zuerst tag.id auflösen, dann article_tags ↔ articles.
  // Inline-Join via PostgREST mit !inner würde funktionieren, ist aber
  // mit dem column-projection für slug-Filter umständlich — zwei Calls
  // sind bei ein paar Dutzend Refs problemlos.
  const { data: tag } = await supabase
    .from("tags")
    .select("id")
    .eq("slug", tagSlug)
    .maybeSingle();
  if (!tag) return [];

  const { data: junction } = await supabase
    .from("article_tags")
    .select("article_id")
    .eq("tag_id", tag.id);
  const articleIds = (junction ?? []).map((j) => j.article_id);
  if (articleIds.length === 0) return [];

  const { data: articles } = await supabase
    .from("articles")
    .select(
      "*, category:categories(slug, name_de, name_en), author:authors(slug, display_name, avatar_url, handle, role)",
    )
    .in("id", articleIds)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (articles as ArticleWithRelations[] | null) ?? [];
}
