import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import TopicListing from "@/components/TopicListing";
import type { ListArticle } from "@/components/ArticleListRow";

const articles: ListArticle[] = [
  { id: 1, category: "AI in Banking",     title: "Data-Driven Banking: Warum KI allein das eigentliche Problem nicht löst",         author: "Andreas Kamm",     date: "07.04.2026", image: "https://picsum.photos/seed/bank1/800/500",  readTime: "6 min", href: "/artikel/data-driven-banking" },
  { id: 10, category: "AI in Banking",    title: "Edge-AI im Mittelstand: Ein Praxisbericht aus drei Pilotprojekten",                author: "Marc Keller",      date: "02.04.2026", image: "https://picsum.photos/seed/extguest1/800/500", readTime: "7 min", href: "/artikel/gastbeitrag-edge-ai-mittelstand", external: true },
  { id: 2, category: "Swiss Hosted GPT",  title: "Fünf versteckte Risiken bei der Nutzung der falschen KI für Unternehmen",          author: "Matthias Zwingli", date: "16.04.2025", image: "https://picsum.photos/seed/ki1/800/500",    readTime: "5 min" },
  { id: 3, category: "EU AI Act",         title: "EU AI-Act: Was Schweizer Unternehmen unbedingt wissen und tun müssen",            author: "Ali Soy",          date: "03.04.2025", image: "https://picsum.photos/seed/ki2/800/500",    readTime: "8 min" },
  { id: 4, category: "AI in Banking",     title: "AI in Banking: Why AI won't transform Banking",                                    author: "Andreas Kamm",     date: "01.04.2026", image: "https://picsum.photos/seed/bank2/800/500",  readTime: "4 min" },
  { id: 5, category: "AI in Banking",     title: "AI Co-Pilots in Banking: How Relationship Managers Stay in Control",               author: "Andreas Kamm",     date: "31.03.2026", image: "https://picsum.photos/seed/bank3/800/500",  readTime: "7 min" },
  { id: 6, category: "KI-Strategie",      title: "Warum 80% der KI-Projekte scheitern — und wie Ihr Unternehmen zu den 20% gehört",   author: "Matthias Zwingli", date: "22.03.2026", image: "https://picsum.photos/seed/strat1/800/500", readTime: "6 min" },
  { id: 7, category: "KI-Strategie",      title: "Make or Buy: Wann lohnt sich eine eigene KI-Infrastruktur?",                       author: "Ali Soy",          date: "15.03.2026", image: "https://picsum.photos/seed/strat2/800/500", readTime: "5 min" },
  { id: 8, category: "EU AI Act",         title: "High-Risk AI Systems: Checkliste für Compliance in der Schweiz",                   author: "Matthias Zwingli", date: "08.03.2026", image: "https://picsum.photos/seed/strat3/800/500", readTime: "9 min" },
  { id: 9, category: "Swiss Hosted GPT",  title: "Datenschutz und KI: Wie Schweizer Unternehmen beides unter einen Hut bringen",     author: "Ali Soy",          date: "01.03.2026", image: "https://picsum.photos/seed/priv1/800/500",  readTime: "6 min" },
];

const subcategories = ["Alle", "AI in Banking", "EU AI Act", "KI-Strategie", "Swiss Hosted GPT"];

const categoryColors: Record<string, string> = {
  "AI in Banking":     "var(--da-green)",
  "EU AI Act":         "var(--da-orange)",
  "KI-Strategie":      "var(--da-purple)",
  "Swiss Hosted GPT":  "var(--da-green)",
};

const trendingTags = ["EU AI Act", "GPT-4o", "Compliance 2026", "Swiss AI", "Automatisierung", "LLM Security", "Datenqualität"];

const authors = [
  { name: "Andreas Kamm",     role: "Banking & AI",  avatar: "https://i.pravatar.cc/80?u=andreas",  count: 3 },
  { name: "Ali Soy",          role: "KI-Strategie",  avatar: "https://i.pravatar.cc/80?u=ali",      count: 3 },
  { name: "Matthias Zwingli", role: "Compliance",    avatar: "https://i.pravatar.cc/80?u=matthias", count: 3 },
];

export default function KIBusinessPage() {
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
