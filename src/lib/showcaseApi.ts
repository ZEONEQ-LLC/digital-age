import "server-only";

// Unternehmensbeitraege (Showcase, S2b). Oeffentliche Lesepfade mit dem
// Anon-Client: nur publizierte Beitraege, und nur solche, deren Unternehmen im
// Verzeichnis sichtbar ist (`!inner` auf ai_startups; anon liest dort nur
// published/featured). Ohne lesbaren Absender gibt es keine Seite: Die
// Kennzeichnung nennt das Unternehmen.
import { RELATIONS_SHORT, type ArticleWithFullRelations, type ArticleWithRelations } from "@/lib/articleApi";
import { PUBLIC_AUTHOR_COLUMNS } from "@/lib/authorApi";
import { contentTypeLabel, type ContentType } from "@/lib/contentType";
import { getCoverUrl } from "@/lib/coverImage";
import { plainExcerpt } from "@/lib/excerpt";
import type { PublicStartupRow } from "@/lib/startupApi";
import { createPublicClient } from "@/lib/supabase/public";
import type { ListArticle } from "@/components/ArticleListRow";

// Spalten des Absenders. Alle stehen in PUBLIC_STARTUP_COLUMNS (anon hat auf
// ai_startups nur Spaltenrechte): eine neue Spalte hier braucht dort den Grant.
export const SHOWCASE_COMPANY_COLUMNS =
  "id, slug, name, tagline, city, industry, swiss_status, website, logo_url, affiliation_note";

export type ShowcaseCompany = Pick<
  PublicStartupRow,
  "id" | "slug" | "name" | "tagline" | "city" | "industry" | "swiss_status" | "website" | "logo_url" | "affiliation_note"
>;

export type ShowcaseArticle = ArticleWithFullRelations & { startup: ShowcaseCompany };
export type ShowcaseListArticle = ArticleWithRelations & { startup: ShowcaseCompany };

const RELATIONS_SHOWCASE_FULL = `*, category:categories(*), author:authors(${PUBLIC_AUTHOR_COLUMNS}), startup:ai_startups!inner(${SHOWCASE_COMPANY_COLUMNS})`;
const RELATIONS_SHOWCASE_SHORT = `${RELATIONS_SHORT}, startup:ai_startups!inner(${SHOWCASE_COMPANY_COLUMNS})`;

export async function getShowcaseArticleBySlug(slug: string): Promise<ShowcaseArticle | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("articles")
    .select(RELATIONS_SHOWCASE_FULL)
    .eq("slug", slug)
    .eq("status", "published")
    .eq("content_type", "company")
    .maybeSingle();
  return (data as ShowcaseArticle | null) ?? null;
}

export type ShowcaseListOptions = {
  startupId?: string;
  authorId?: string;
  excludeId?: string;
  limit?: number;
};

// Publizierte Unternehmensbeitraege, neueste zuerst.
export async function getShowcaseArticles(opts: ShowcaseListOptions = {}): Promise<ShowcaseListArticle[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("articles")
    .select(RELATIONS_SHOWCASE_SHORT)
    .eq("status", "published")
    .eq("content_type", "company")
    .order("published_at", { ascending: false });
  if (opts.startupId) query = query.eq("startup_id", opts.startupId);
  if (opts.authorId) query = query.eq("author_id", opts.authorId);
  if (opts.excludeId) query = query.neq("id", opts.excludeId);
  if (opts.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) {
    console.error("[showcase] list failed:", error.message);
    return [];
  }
  return (data as ShowcaseListArticle[] | null) ?? [];
}

// Anzahl publizierter Unternehmensbeitraege (fuer den Verweis im Verzeichnis).
export async function getShowcaseCount(): Promise<number> {
  const supabase = createPublicClient();
  const { count, error } = await supabase
    .from("articles")
    .select("id, startup:ai_startups!inner(id)", { count: "exact", head: true })
    .eq("status", "published")
    .eq("content_type", "company");
  if (error) {
    console.error("[showcase] count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

// Unternehmensbeitraege zu einem Tag. Die Tag-Seite zeigt sie in einem
// eigenen, gekennzeichneten Abschnitt unter den redaktionellen Artikeln.
export async function getShowcaseArticlesByTagSlug(tagSlug: string, limit = 10): Promise<ShowcaseListArticle[]> {
  const supabase = createPublicClient();
  const { data: tag } = await supabase.from("tags").select("id").eq("slug", tagSlug).maybeSingle();
  if (!tag) return [];
  const { data: junction } = await supabase.from("article_tags").select("article_id").eq("tag_id", tag.id);
  const ids = (junction ?? []).map((j) => j.article_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("articles")
    .select(RELATIONS_SHOWCASE_SHORT)
    .in("id", ids)
    .eq("status", "published")
    .eq("content_type", "company")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[showcase] tag list failed:", error.message);
    return [];
  }
  return (data as ShowcaseListArticle[] | null) ?? [];
}

// Einordnung eines publizierten Artikels, fuer die Weiterleitung zwischen
// /artikel/<slug> und /showcase/<slug>. null = es gibt keinen publizierten
// Artikel mit diesem Slug.
export async function getPublishedContentType(slug: string): Promise<ContentType | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("articles")
    .select("content_type")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data?.content_type === "company" ? "company" : data ? "editorial" : null;
}

function formatDateDE(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export type ShowcaseListRow = ListArticle & {
  companySlug: string;
  industry: string | null;
};

// Zeile fuer Listen (/showcase, Profil, «Weitere Beiträge»): dieselbe
// Listenzeile wie in den Rubriken, mit Kennzeichnung und Absender im Kopf.
export function showcaseToListRow(article: ShowcaseListArticle): ShowcaseListRow {
  const minutes = article.reading_minutes ?? 0;
  return {
    id: article.id,
    category: "Showcase",
    title: article.title,
    author: article.author?.display_name ?? "",
    authorSlug: article.author?.slug,
    date: formatDateDE(article.published_at),
    image: getCoverUrl(article),
    readTime: minutes > 0 ? `${minutes} min` : "—",
    href: `/showcase/${article.slug}`,
    external: false,
    excerpt: plainExcerpt(article.excerpt) || undefined,
    sender: {
      label: contentTypeLabel(article) ?? "Unternehmensbeitrag",
      name: article.startup.name,
    },
    companySlug: article.startup.slug,
    industry: article.startup.industry ?? null,
  };
}
