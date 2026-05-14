// Mapper-Functions zwischen Supabase-Row-Shapes und Card-Component-Props.
// Halten die Frontend-Komponenten frei von Supabase-spezifischen Field-Namen
// (cover_image_url, display_name, ...), damit Card-Re-Designs nicht den
// DB-Abfrage-Layer brechen.

import type { ArticleWithRelations } from "@/lib/articleApi";
import type { Database } from "@/lib/database.types";
import { getCoverUrl } from "@/lib/coverImage";
import type { ListArticle } from "@/components/ArticleListRow";

type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];

export type CardArticle = {
  category: string;
  title: string;
  author: string;
  date: string;
  image: string;
  href: string;
  external?: boolean;
};

function formatDateDE(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function articleToCard(article: ArticleWithRelations): CardArticle {
  const subcategory = article.subcategory ?? article.category?.name_de ?? "";
  return {
    category: subcategory,
    title: article.title,
    author: article.author?.display_name ?? "Unbekannt",
    date: formatDateDE(article.published_at),
    image: getCoverUrl(article),
    href: `/artikel/${article.slug}`,
    external: article.author?.role === "external",
  };
}

export function articleToListRow(
  article: ArticleWithRelations,
  index: number,
): ListArticle {
  const card = articleToCard(article);
  const readMin = article.reading_minutes ?? 0;
  return {
    id: article.id ?? index,
    category: card.category,
    title: card.title,
    author: card.author,
    date: card.date,
    image: card.image,
    readTime: readMin > 0 ? `${readMin} min` : "—",
    href: card.href,
    external: card.external,
  };
}

export function authorToProfileViewModel(author: AuthorRow) {
  const social = (author.social_links ?? {}) as Record<string, string | undefined>;
  return {
    id: author.id,
    name: author.display_name,
    handle: author.handle ?? author.slug,
    avatar: author.avatar_url ?? "",
    bio: author.bio ?? "",
    jobTitle: author.job_title ?? null,
    location: author.location ?? null,
    role: author.role,
    isExternal: author.role === "external",
    social: {
      linkedin: social.linkedin,
      x: social.x,
      mastodon: social.mastodon,
      github: social.github,
      website: social.website,
    },
  };
}
