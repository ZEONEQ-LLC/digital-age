import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import TopicListing from "@/components/TopicListing";
import type { ListArticle } from "@/components/ArticleListRow";

const articles: ListArticle[] = [
  { id: 1, category: "GenAI",            title: "IoT-Geräte vernetzen mit AI – aber richtig: Warum OpenAI API nicht die Lösung ist",     author: "Ali Soy",          date: "10.02.2025", image: "https://picsum.photos/seed/iot1/800/500",   readTime: "6 min" },
  { id: 10, category: "Robotics",        title: "Autonome Lagerroboter: Was im Schweizer KMU funktioniert",                              author: "Lena Vogt",        date: "20.02.2026", image: "https://picsum.photos/seed/extguest2/800/500", readTime: "7 min", href: "/artikel/gastbeitrag-autonome-lagerroboter", external: true },
  { id: 2, category: "GenAI",            title: "Interoperabilität für IoT – Wie AI die Sprachbarrieren zwischen Maschinen überwindet",  author: "Ali Soy",          date: "07.02.2025", image: "https://picsum.photos/seed/iot2/800/500",   readTime: "5 min" },
  { id: 3, category: "Blockchain",       title: "Blockchain of Things – Dezentralisierung trifft auf intelligente Maschinen",            author: "Ali Soy",          date: "23.01.2025", image: "https://picsum.photos/seed/block1/800/500", readTime: "8 min" },
  { id: 4, category: "Robotics",         title: "Autonome Drohnen in der Industrie: Wie AI Lagerhaltung neu definiert",                  author: "Matthias Zwingli", date: "15.03.2026", image: "https://picsum.photos/seed/drone1/800/500", readTime: "7 min" },
  { id: 5, category: "GenAI",            title: "Multimodale KI: Was passiert, wenn Maschinen sehen, hören und lesen können",            author: "Andreas Kamm",     date: "02.03.2026", image: "https://picsum.photos/seed/mm1/800/500",    readTime: "6 min" },
  { id: 6, category: "Quantencomputing", title: "Quantencomputer 2026: Wo stehen wir wirklich — und wann kommt der Durchbruch?",         author: "Ali Soy",          date: "20.02.2026", image: "https://picsum.photos/seed/qc1/800/500",    readTime: "9 min" },
  { id: 7, category: "Robotics",         title: "Cobots im KMU: Wie kleine Betriebe von kollaborativer Robotik profitieren",             author: "Matthias Zwingli", date: "10.02.2026", image: "https://picsum.photos/seed/cobot1/800/500", readTime: "5 min" },
  { id: 8, category: "Blockchain",       title: "Smart Contracts in der Lieferkette: Praxisbericht aus der Schweizer Industrie",         author: "Ali Soy",          date: "01.02.2026", image: "https://picsum.photos/seed/sc1/800/500",    readTime: "7 min" },
  { id: 9, category: "Quantencomputing", title: "Post-Quantum Kryptographie: Warum Unternehmen jetzt handeln müssen",                    author: "Andreas Kamm",     date: "20.01.2026", image: "https://picsum.photos/seed/pqc1/800/500",   readTime: "6 min" },
];

const subcategories = ["Alle", "GenAI", "Blockchain", "Robotics", "Quantencomputing"];

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

export default function FutureTechPage() {
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
