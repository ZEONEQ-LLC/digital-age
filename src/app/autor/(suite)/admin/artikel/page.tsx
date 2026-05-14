import PageTitle from "@/components/author/PageTitle";
import { createClient } from "@/lib/supabase/server";
import AdminArticlesClient, { type AdminArticleRow } from "./AdminArticlesClient";

export default async function AdminArticlesPage() {
  const supabase = await createClient();

  const [articlesRes, authorsRes, categoriesRes] = await Promise.all([
    supabase
      .from("articles")
      .select(
        "id, slug, title, status, cover_image_url, published_at, reading_minutes, word_count, author_id, category_id, tags, is_featured, is_hero",
      )
      .order("published_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("authors")
      .select("id, display_name")
      .order("display_name"),
    supabase
      .from("categories")
      .select("id, slug, name_de")
      .order("display_order"),
  ]);

  const authorMap = new Map<string, string>(
    (authorsRes.data ?? []).map((a) => [a.id, a.display_name]),
  );
  const categoryMap = new Map<string, { slug: string; name: string }>(
    (categoriesRes.data ?? []).map((c) => [c.id, { slug: c.slug, name: c.name_de }]),
  );

  const rows: AdminArticleRow[] = (articlesRes.data ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    status: a.status,
    coverImageUrl: a.cover_image_url,
    publishedAt: a.published_at,
    readingMinutes: a.reading_minutes,
    wordCount: a.word_count,
    authorId: a.author_id,
    authorName: authorMap.get(a.author_id) ?? "—",
    categoryId: a.category_id,
    categorySlug: categoryMap.get(a.category_id)?.slug ?? "",
    categoryName: categoryMap.get(a.category_id)?.name ?? "",
    tags: a.tags ?? [],
    isFeatured: a.is_featured ?? false,
    isHero: a.is_hero ?? false,
  }));

  return (
    <>
      <PageTitle
        title="Alle Artikel"
        subtitle={`${rows.length} Artikel insgesamt`}
      />
      <AdminArticlesClient
        rows={rows}
        authors={authorsRes.data ?? []}
        categories={(categoriesRes.data ?? []).map((c) => ({
          id: c.id,
          name: c.name_de,
        }))}
      />
    </>
  );
}
