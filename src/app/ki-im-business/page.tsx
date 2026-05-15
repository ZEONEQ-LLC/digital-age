import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import SpotlightSection from "@/components/SpotlightSection";
import TopicListing from "@/components/TopicListing";
import { getArticlesByCategory, getFeaturedByCategory } from "@/lib/articleApi";
import { getTopTags } from "@/lib/tags";
import { articleToListRow } from "@/lib/mappers/articleMappers";

const categoryColors: Record<string, string> = {
  "AI in Banking":     "var(--da-green)",
  "EU AI Act":         "var(--da-orange)",
  "KI-Strategie":      "var(--da-purple)",
  "Swiss Hosted GPT":  "var(--da-green)",
};

// Statische Trending-Liste entfernt — kommt mit dem Tag-System (Phase 8d).
// TopicListing blendet den Block aus, wenn das Array leer ist.
const trendingTags: string[] = [];

export default async function KIBusinessPage() {
  const [rows, featured, topTagsRaw] = await Promise.all([
    getArticlesByCategory("ki-business"),
    getFeaturedByCategory("ki-business", 3),
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
    { name: string; avatar: string; count: number }
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
        avatar: row.author.avatar_url ?? "",
        count: 1,
      });
    }
  }
  const authors = Array.from(authorMap.values()).sort(
    (a, b) => b.count - a.count,
  );

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <SpotlightSection articles={featured} />
      <TopicListing
        topicLabel="KI & Business"
        lead="Wie KI Unternehmen in der DACH-Region transformiert — Strategien, Praxisberichte, Entscheidungshilfen."
        articles={articles}
        subcategories={subcategories}
        categoryColors={categoryColors}
        trendingTags={trendingTags}
        authors={authors}
        topTags={topTags}
        accentColor="green"
      />
      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
