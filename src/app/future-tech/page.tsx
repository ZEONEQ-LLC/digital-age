import { Suspense } from "react";

import Footer from "@/components/Footer";
import SpotlightSection from "@/components/SpotlightSection";
import TopicHeader from "@/components/TopicHeader";
import TopicListing from "@/components/TopicListing";
import { getArticlesByCategory, getFeaturedByCategory } from "@/lib/articleApi";
import { getTopTags } from "@/lib/tags";
import { articleToListRow } from "@/lib/mappers/articleMappers";
import { buildListingMetadata } from "@/lib/listingMetadata";
import { buildItemListJsonLd } from "@/lib/jsonLd";
import { getBaseUrl } from "@/lib/siteUrl";

export const revalidate = 120;

export const metadata = buildListingMetadata({
  path: "/future-tech",
  title: "Future Tech — Quanten, Robotik, IoT und neue Materialien",
  description:
    "Future-Tech-Analysen: Quantencomputing, Robotik, IoT, neue Materialien und Schweizer Halbleiter. Hintergrund statt Hype, mit Blick auf den Schweizer Markt.",
});

const categoryColors: Record<string, string> = {
  "GenAI":            "var(--da-green)",
  "Blockchain":       "var(--da-orange)",
  "Robotics":         "var(--da-purple)",
  "Quantencomputing": "var(--da-green)",
};

// Statische Trending-Liste entfernt — kommt mit dem Tag-System (Phase 8d).
// TopicListing blendet den Block aus, wenn das Array leer ist.
const trendingTags: string[] = [];

export default async function FutureTechPage() {
  const [rows, featured, topTagsRaw] = await Promise.all([
    getArticlesByCategory("future-tech"),
    getFeaturedByCategory("future-tech", 3),
    getTopTags(5),
  ]);
  const topTags = topTagsRaw.map((t) => ({
    slug: t.slug,
    name: t.name,
    count: Number(t.article_count),
  }));
  const articles = rows.map(articleToListRow);

  const subcategorySet = new Set<string>();
  for (const row of rows) {
    if (row.subcategory) subcategorySet.add(row.subcategory);
  }
  const subcategories = ["Alle", ...Array.from(subcategorySet).sort()];

  // Authors aus geladenen Articles abgeleitet (Name + Avatar + Count).
  // Role/Job-Title wird bewusst nicht angezeigt — schränkt thematisch zu stark ein.
  // TODO Phase 8: Klick-Logic für Author-Filter (URL-Param, Server-Side-Filter).
  const authorMap = new Map<
    string,
    { name: string; slug: string; avatar: string; count: number }
  >();
  for (const row of rows) {
    if (!row.author) continue;
    const slug = row.author.slug;
    const existing = authorMap.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      authorMap.set(slug, {
        name: row.author.display_name,
        slug,
        avatar: row.author.avatar_url ?? "",
        count: 1,
      });
    }
  }
  const authors = Array.from(authorMap.values()).sort(
    (a, b) => b.count - a.count,
  );

  const baseUrl = getBaseUrl();
  const itemListJsonLd = buildItemListJsonLd({
    name: "Future Tech — Artikel",
    items: rows.map((row) => ({
      url: `${baseUrl}/artikel/${row.slug}`,
      name: row.title,
    })),
  });

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: itemListJsonLd }}
      />
      <SpotlightSection articles={featured} />
      {/* Header server-rendered (mit H1) — bewusst AUSSERHALB der Suspense-
          Boundary, damit die H1 im SSR-HTML steht. Vorher sass der ganze
          Header inkl. H1 in TopicListing innerhalb der Suspense und wurde
          durch fallback={null} im rohen HTML verschluckt. */}
      <TopicHeader
        topicLabel="Future Tech"
        lead="Technologien von morgen — heute verstehen. GenAI, IoT, Blockchain und die Innovationen, die unsere Welt neu gestalten."
        articleCount={articles.length}
        bgImages={articles.slice(0, 5).map((a) => a.image)}
        accentColor="purple"
      />
      {/* Suspense wegen useSearchParams in TopicListing — nötig damit
          die Page static prerendered + via revalidate gecacht werden kann. */}
      <Suspense fallback={null}>
        <TopicListing
          articles={articles}
          subcategories={subcategories}
          categoryColors={categoryColors}
          trendingTags={trendingTags}
          authors={authors}
          topTags={topTags}
          accentColor="purple"
        />
      </Suspense>
      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
