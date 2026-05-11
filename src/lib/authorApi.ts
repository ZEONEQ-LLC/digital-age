import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];
export type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type RevisionRow = Database["public"]["Tables"]["revisions"]["Row"];
export type ArticleStatus = Database["public"]["Enums"]["article_status"];

export type AuthorArticle = ArticleRow & {
  category: Pick<CategoryRow, "slug" | "name_de" | "name_en"> | null;
};

export type SuiteArticle = ArticleRow & {
  category: Pick<CategoryRow, "id" | "slug" | "name_de"> | null;
  author: Pick<AuthorRow, "id" | "display_name" | "slug" | "handle"> | null;
};

export type DashboardStats = {
  draftCount: number;
  inReviewCount: number;
  publishedCount: number;
  archivedCount: number;
  totalWordCount: number;
  totalReadingMinutes: number;
};

export type RevisionWithEditor = RevisionRow & {
  editor: Pick<AuthorRow, "id" | "display_name" | "slug"> | null;
};

export async function getCurrentAuthor(): Promise<AuthorRow | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: author } = await supabase
    .from("authors")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return author;
}

export async function getAuthorByHandle(handle: string): Promise<AuthorRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("authors")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();
  return data;
}

export async function getArticlesByAuthor(authorId: string): Promise<AuthorArticle[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("*, category:categories(slug, name_de, name_en)")
    .eq("author_id", authorId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data as AuthorArticle[] | null) ?? [];
}

// Suite-side: RLS sorgt automatisch dafür dass Editor alle Artikel sieht,
// Author nur eigene. Status-Filter optional.
export async function getMyArticles(opts?: { status?: ArticleStatus }): Promise<SuiteArticle[]> {
  const supabase = await createClient();
  let query = supabase
    .from("articles")
    .select(
      "*, category:categories(id, slug, name_de), author:authors(id, display_name, slug, handle)",
    )
    .order("updated_at", { ascending: false });

  if (opts?.status) query = query.eq("status", opts.status);

  const { data } = await query;
  return (data as SuiteArticle[] | null) ?? [];
}

export async function getArticleById(id: string): Promise<SuiteArticle | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(
      "*, category:categories(id, slug, name_de), author:authors(id, display_name, slug, handle)",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as SuiteArticle | null) ?? null;
}

export async function getRevisions(articleId: string): Promise<RevisionWithEditor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("revisions")
    .select("*, editor:authors!editor_id(id, display_name, slug)")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false });
  return (data as RevisionWithEditor[] | null) ?? [];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("status, word_count, reading_minutes");

  const rows = data ?? [];
  const stats: DashboardStats = {
    draftCount: 0,
    inReviewCount: 0,
    publishedCount: 0,
    archivedCount: 0,
    totalWordCount: 0,
    totalReadingMinutes: 0,
  };

  for (const r of rows) {
    if (r.status === "draft") stats.draftCount += 1;
    else if (r.status === "in_review") stats.inReviewCount += 1;
    else if (r.status === "published") stats.publishedCount += 1;
    else if (r.status === "archived") stats.archivedCount += 1;
    stats.totalWordCount += r.word_count ?? 0;
    stats.totalReadingMinutes += r.reading_minutes ?? 0;
  }
  return stats;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
