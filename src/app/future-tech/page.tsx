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

const trendingTags = ["GenAI 2026", "Quantum", "IoT", "Smart Contracts", "Cobots", "LLM Agents", "Post-Quantum"];

const authors = [
  { name: "Ali Soy",          role: "Future Tech",   avatar: "https://i.pravatar.cc/80?u=ali",      count: 5 },
  { name: "Matthias Zwingli", role: "Robotics & IoT", avatar: "https://i.pravatar.cc/80?u=matthias", count: 2 },
  { name: "Andreas Kamm",     role: "Emerging Tech", avatar: "https://i.pravatar.cc/80?u=andreas",  count: 2 },
];

export default async function FutureTechPage() {
  const rows = await getArticlesByCategory("future-tech");
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
