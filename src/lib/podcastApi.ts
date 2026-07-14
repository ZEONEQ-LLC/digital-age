// Gemischtes Modul: getPublishedPodcasts ist Public-Read → Anon-Client.
// getMyPodcasts / getPodcastById sind Auth-gebunden (RLS-Schnitt für
// Author/Editor bzw. Draft-Lookup im Suite-Editor) und bleiben am ssr-
// Client mit cookies().
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/database.types";

export type PodcastRow = Database["public"]["Tables"]["podcasts"]["Row"];
type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];

export type PodcastLanguage = "de" | "en" | "fr" | "it";

export type PodcastWithRecommender = PodcastRow & {
  recommended_by: Pick<
    AuthorRow,
    "id" | "display_name" | "slug" | "handle" | "avatar_url"
  > | null;
};

export type PodcastFilters = {
  language?: PodcastLanguage;
  category?: string;
};

// PUBLIC: is_published=true, kein User-Filter.
export async function getPublishedPodcasts(
  filters?: PodcastFilters,
): Promise<PodcastWithRecommender[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("podcasts")
    .select(
      "*, recommended_by:authors!recommended_by_id(id, display_name, slug, handle, avatar_url)",
    )
    .eq("is_published", true)
    .order("recommended_at", { ascending: false });

  if (filters?.language) query = query.eq("language", filters.language);
  if (filters?.category) query = query.eq("podcast_category", filters.category);

  const { data, error } = await query;
  if (error) throw error;
  return (data as PodcastWithRecommender[] | null) ?? [];
}

// PUBLIC: Einzelner Podcast per Slug (Detailseite). Nur published, kein
// User-Filter (RLS: podcasts_public_read_published).
export async function getPodcastBySlug(
  slug: string,
): Promise<PodcastWithRecommender | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("podcasts")
    .select(
      "*, recommended_by:authors!recommended_by_id(id, display_name, slug, handle, avatar_url)",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return (data as PodcastWithRecommender | null) ?? null;
}

// PUBLIC: alle published Podcasts, die auf einen Artikel-Slug verweisen
// (fuer den Player-Block auf der Beitragsseite).
export async function getPodcastsByArticleSlug(
  articleSlug: string,
): Promise<PodcastWithRecommender[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("podcasts")
    .select(
      "*, recommended_by:authors!recommended_by_id(id, display_name, slug, handle, avatar_url)",
    )
    .eq("related_article_slug", articleSlug)
    .eq("is_published", true)
    .order("recommended_at", { ascending: false });
  return (data as PodcastWithRecommender[] | null) ?? [];
}

// PUBLIC: Karten-Daten eines verknuepften Artikels (Cover/Titel/Teaser) fuer
// die "Verwandter Artikel"-Karte auf der Podcast-Detailseite. Nur published.
export type RelatedArticleCard = {
  slug: string;
  title: string;
  coverUrl: string | null;
  excerpt: string | null;
};

export async function getRelatedArticleCard(
  slug: string,
): Promise<RelatedArticleCard | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("articles")
    .select("slug, title, cover_image_url, excerpt")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  return {
    slug: data.slug,
    title: data.title,
    coverUrl: data.cover_image_url,
    excerpt: data.excerpt,
  };
}

// PUBLIC: nur Slugs published Podcasts — fuer generateStaticParams.
export async function getPublishedPodcastSlugs(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("podcasts")
    .select("slug")
    .eq("is_published", true);
  return (data ?? []).map((r) => r.slug as string).filter(Boolean);
}

// Suite-side: RLS regelt — Editor sieht alle, Author nur eigene
// (recommended_by_id = current). Externe Authors haben kein insert/update,
// können aber lesen falls sie als recommended_by_id eingetragen sind (Legacy).
export async function getMyPodcasts(): Promise<PodcastWithRecommender[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("podcasts")
    .select(
      "*, recommended_by:authors!recommended_by_id(id, display_name, slug, handle, avatar_url)",
    )
    .order("recommended_at", { ascending: false });
  if (error) throw error;
  return (data as PodcastWithRecommender[] | null) ?? [];
}

export async function getPodcastById(id: string): Promise<PodcastWithRecommender | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("podcasts")
    .select(
      "*, recommended_by:authors!recommended_by_id(id, display_name, slug, handle, avatar_url)",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as PodcastWithRecommender | null) ?? null;
}
