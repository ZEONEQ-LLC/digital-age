import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import ShowcaseArticleView from "@/components/showcase/ShowcaseArticleView";
import { buildArticleMetadata } from "@/lib/articlePage";
import { SHOWCASE_PATH } from "@/lib/contentType";
import {
  getPublishedContentType,
  getShowcaseArticleBySlug,
  getShowcaseArticles,
  showcaseToListRow,
} from "@/lib/showcaseApi";
import { getPodcastsByArticleSlug } from "@/lib/podcastApi";
import { teaserImagePath } from "@/lib/showcase/kit";
import { getBaseUrl } from "@/lib/siteUrl";
import { createPublicClient } from "@/lib/supabase/public";

// Unternehmensbeitrag im Showcase (S2b). Eigene Route, eigener Aufbau: siehe
// ShowcaseArticleView. /artikel/<slug> leitet Unternehmensbeitraege hierher
// weiter; ein redaktioneller Slug wird von hier zurueckgeleitet.

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 600;

export async function generateStaticParams() {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("articles")
      .select("slug")
      .eq("status", "published")
      .eq("content_type", "company");
    return (data ?? []).map((a) => ({ slug: a.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getShowcaseArticleBySlug(slug);
  if (!article) return {};
  const base = getBaseUrl();
  const meta = buildArticleMetadata(article, base, `${SHOWCASE_PATH}/${article.slug}`);
  // Teilen-Bild mit Kennzeichnung (Showcase S4) statt Cover oder eigenem Bild.
  const image = { url: `${base}${teaserImagePath(article.slug)}`, width: 1200, height: 630, alt: `${article.title}: ${article.startup.name} im Showcase von digital age` };
  return {
    ...meta,
    openGraph: { ...meta.openGraph, images: [image] },
    twitter: { ...meta.twitter, images: [image] },
  };
}

export default async function ShowcaseArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getShowcaseArticleBySlug(slug);
  if (!article) {
    // Redaktionelle Artikel stehen unter /artikel/<slug>. Bewusst keine
    // permanente Weiterleitung: Stellt die Redaktion einen Beitrag zurueck auf
    // redaktionell, soll kein Browser eine alte Richtung fest gespeichert haben.
    if ((await getPublishedContentType(slug)) === "editorial") redirect(`/artikel/${slug}`);
    notFound();
  }
  if (!article.author) notFound();
  // Zuerst weitere Beitraege desselben Unternehmens, sonst andere aus dem Showcase.
  const [sameCompany, linkedPodcasts] = await Promise.all([
    getShowcaseArticles({ startupId: article.startup.id, excludeId: article.id, limit: 3 }),
    getPodcastsByArticleSlug(article.slug),
  ]);
  const more = sameCompany.length > 0 ? sameCompany : await getShowcaseArticles({ excludeId: article.id, limit: 3 });
  return (
    <ShowcaseArticleView
      article={article}
      moreHeading={sameCompany.length > 0 ? `Weitere Beiträge von ${article.startup.name}` : "Weitere Beiträge im Showcase"}
      moreRows={more.map(showcaseToListRow)}
      baseUrl={getBaseUrl()}
      linkedPodcasts={linkedPodcasts}
    />
  );
}
