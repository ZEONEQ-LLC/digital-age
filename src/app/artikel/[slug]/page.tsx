import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import ArticleView from "@/components/article/ArticleView";
import { getSlotReservation } from "@/lib/ads/slotReservation";
import { getArticleBySlug } from "@/lib/articleApi";
import { getArticlesByAuthor } from "@/lib/authorApi";
import { buildArticleMetadata, buildRelatedCards } from "@/lib/articlePage";
import { SHOWCASE_PATH, editorialOnly } from "@/lib/contentType";
import { getPublishedContentType } from "@/lib/showcaseApi";
import { getBaseUrl } from "@/lib/siteUrl";
import { createPublicClient } from "@/lib/supabase/public";
import { getPodcastsByArticleSlug } from "@/lib/podcastApi";

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 600;

// SSG: alle published Article-Slugs vorab generieren. Damit greift
// revalidate als ISR auf Vercel-Edge (siehe Vorbild in /tag/[slug] +
// Erkenntnis aus PR #114-Live-Test). Anon-Client → kein cookies(), das
// ist der entscheidende Punkt für Static-Rendering.
// Fallback bei fehlenden Build-Env-Vars: leeres Array, Next.js rendert
// jeden Slug on-demand und ISR-cached danach.
export async function generateStaticParams() {
  try {
    const supabase = createPublicClient();
    const { data } = await editorialOnly(
      supabase.from("articles").select("slug").eq("status", "published"),
    );
    return (data ?? []).map((a) => ({ slug: a.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return buildArticleMetadata(article, getBaseUrl(), `/artikel/${article.slug}`);
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    // Unternehmensbeitraege stehen unter /showcase/<slug> (S2b). Alte Links,
    // Suchmaschinen und interne Verweise auf /artikel/<slug> landen dort.
    if ((await getPublishedContentType(slug)) === "company") permanentRedirect(`${SHOWCASE_PATH}/${slug}`);
    notFound();
  }
  const author = article.author;
  if (!author) notFound();
  // Die Ansicht selbst laedt nichts (ArticleView, auch von der Vorschau
  // genutzt): Anzeigen-Reservierung, Podcasts zum Beitrag und weitere Artikel
  // des Autors kommen von hier.
  const [moduleReserve, linkedPodcasts, authorArticles] = await Promise.all([
    getSlotReservation("article_inline"),
    getPodcastsByArticleSlug(article.slug),
    getArticlesByAuthor(author.id),
  ]);
  return (
    <ArticleView
      article={article}
      baseUrl={getBaseUrl()}
      linkedPodcasts={linkedPodcasts}
      related={buildRelatedCards(authorArticles, {
        excludeId: article.id,
        authorName: author.display_name,
        external: author.role === "external",
      })}
      moduleReserve={moduleReserve}
    />
  );
}
