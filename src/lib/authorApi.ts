import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];
type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export type AuthorArticle = ArticleRow & {
  category: Pick<CategoryRow, "slug" | "name_de" | "name_en"> | null;
};

// Server-side: liest die aktuelle Supabase-Session und holt den zugehörigen
// authors-Row. Kommt null zurück, ist niemand eingeloggt.
export async function getCurrentAuthor(): Promise<AuthorRow | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: author } = await supabase
    .from("authors")
    .select("*")
    .eq("user_id", user.id)
    .single();

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
