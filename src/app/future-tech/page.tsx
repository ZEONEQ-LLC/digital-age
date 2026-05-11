import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import TopicListing from "@/components/TopicListing";
import { getArticlesByCategory } from "@/lib/articleApi";
import { articleToListRow } from "@/lib/mappers/articleMappers";

const categoryColors: Record<string, string> = {
  "GenAI":            "var(--da-green)",
  "Blockchain":       "var(--da-orange)",
  "Robotics":         "var(--da-purple)",
  "Quantencomputing": "var(--da-green)",
};

// TODO Phase 8: Trending-Chips ohne Klick-Logik (rein UI). Braucht Tag-System
// + Trending-Metrik in eigener Migration.
const trendingTags = ["GenAI 2026", "Quantum", "IoT", "Smart Contracts", "Cobots", "LLM Agents", "Post-Quantum"];

export default async function FutureTechPage() {
  const rows = await getArticlesByCategory("future-tech");
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
      <TopicListing
        topicLabel="Future Tech"
        lead="Technologien von morgen — heute verstehen. GenAI, IoT, Blockchain und die Innovationen, die unsere Welt neu gestalten."
        articles={articles}
        subcategories={subcategories}
        categoryColors={categoryColors}
        trendingTags={trendingTags}
        authors={authors}
        newsletter={{ title: "Future Tech — wöchentlich", rhythm: "Jeden Donnerstag. Kein Spam." }}
        accentColor="purple"
      />
      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
