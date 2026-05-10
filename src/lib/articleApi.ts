import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];

export type ArticleWithRelations = ArticleRow & {
  category: Pick<CategoryRow, "slug" | "name_de" | "name_en"> | null;
  author: Pick<
    AuthorRow,
    "slug" | "display_name" | "avatar_url" | "handle" | "role"
  > | null;
};

export type ArticleWithFullRelations = ArticleRow & {
  category: CategoryRow | null;
  author: AuthorRow | null;
};

const RELATIONS_SHORT =
  "*, category:categories(slug, name_de, name_en), author:authors(slug, display_name, avatar_url, handle, role)";

const RELATIONS_FULL = "*, category:categories(*), author:authors(*)";

export async function getFeaturedArticles(limit = 4): Promise<ArticleWithRelations[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(RELATIONS_SHORT)
    .eq("status", "published")
    .eq("is_featured", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data as ArticleWithRelations[] | null) ?? [];
}

export async function getArticlesByCategory(
  categorySlug: string,
  limit?: number,
): Promise<ArticleWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("articles")
    .select(
      "*, category:categories!inner(slug, name_de, name_en), author:authors(slug, display_name, avatar_url, handle, role)",
    )
    .eq("status", "published")
    .eq("category.slug", categorySlug)
    .order("published_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data as ArticleWithRelations[] | null) ?? [];
}

export async function getArticleBySlug(
  slug: string,
): Promise<ArticleWithFullRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(RELATIONS_FULL)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data as ArticleWithFullRelations | null;
}
