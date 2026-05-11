import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import TopicListing from "@/components/TopicListing";
import { getArticlesByCategory } from "@/lib/articleApi";
import { articleToListRow } from "@/lib/mappers/articleMappers";

const categoryColors: Record<string, string> = {
  "AI in Banking":     "var(--da-green)",
  "EU AI Act":         "var(--da-orange)",
  "KI-Strategie":      "var(--da-purple)",
  "Swiss Hosted GPT":  "var(--da-green)",
};

// TODO Phase 8: Trending-Chips ohne Klick-Logik (rein UI). Braucht Tag-System
// + Trending-Metrik in eigener Migration.
const trendingTags = ["EU AI Act", "GPT-4o", "Compliance 2026", "Swiss AI", "Automatisierung", "LLM Security", "Datenqualität"];

// TODO Phase 8: Author-Filter ohne Klick-Logik. Server-Side-Filter via URL-Param
// machbar, aber bisher nicht implementiert.
const authors = [
  { name: "Andreas Kamm",     role: "Banking & AI",  avatar: "https://i.pravatar.cc/80?u=andreas",  count: 3 },
  { name: "Ali Soy",          role: "KI-Strategie",  avatar: "https://i.pravatar.cc/80?u=ali",      count: 3 },
  { name: "Matthias Zwingli", role: "Compliance",    avatar: "https://i.pravatar.cc/80?u=matthias", count: 3 },
];

export default async function KIBusinessPage() {
  const rows = await getArticlesByCategory("ki-business");
  const articles = rows.map(articleToListRow);

  const subcategorySet = new Set<string>();
  for (const row of rows) {
    if (row.subcategory) subcategorySet.add(row.subcategory);
  }
  const subcategories = ["Alle", ...Array.from(subcategorySet).sort()];

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <TopicListing
        topicLabel="KI & Business"
        lead="Wie KI Unternehmen in der DACH-Region transformiert — Strategien, Praxisberichte, Entscheidungshilfen."
        articles={articles}
        subcategories={subcategories}
        categoryColors={categoryColors}
        trendingTags={trendingTags}
        authors={authors}
        newsletter={{ title: "KI & Business — wöchentlich", rhythm: "Jeden Montag. Kein Spam." }}
        accentColor="green"
      />
      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
