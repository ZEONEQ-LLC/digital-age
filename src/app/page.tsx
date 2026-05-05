import NewsTicker from "@/components/NewsTicker";
import Hero from "@/components/Hero";
import ArticleSection from "@/components/ArticleSection";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";

const featured = [
  { category: "Swiss Hosted GPT", title: "Fünf versteckte Risiken bei der Nutzung der falschen KI für Unternehmen", author: "Matthias Zwingli", date: "16.04.2025", image: "https://picsum.photos/seed/ki1/800/450" },
  { category: "EU AI Act", title: "EU AI-Act: Was Schweizer Unternehmen unbedingt wissen und tun müssen", author: "Ali Soy", date: "03.04.2025", image: "https://picsum.photos/seed/ki2/800/450" },
];

const kiBusiness = [
  { category: "AI in Banking", title: "Data-Driven Banking: Why AI Alone Won't Fix the Real Problem", author: "Andreas Kamm", date: "07.04.2026", image: "https://picsum.photos/seed/bank1/600/400" },
  { category: "AI in Banking", title: "AI in Banking: Why AI won't transform Banking", author: "Andreas Kamm", date: "01.04.2026", image: "https://picsum.photos/seed/bank2/600/400" },
  { category: "AI in Banking", title: "AI Co-Pilots in Banking: How Relationship Managers Stay in Control", author: "Andreas Kamm", date: "31.03.2026", image: "https://picsum.photos/seed/bank3/600/400" },
];

const futureTech = [
  { category: "GenAI", title: "IoT-Geräte vernetzen mit AI – aber richtig: Warum OpenAI API nicht die Lösung ist", author: "Ali Soy", date: "10.02.2025", image: "https://picsum.photos/seed/iot1/600/400" },
  { category: "GenAI", title: "Interoperabilität für IoT – Wie AI die Sprachbarrieren zwischen Maschinen überwindet", author: "Ali Soy", date: "07.02.2025", image: "https://picsum.photos/seed/iot2/600/400" },
  { category: "Blockchain", title: "Blockchain of Things", author: "Ali Soy", date: "23.01.2021", image: "https://picsum.photos/seed/block1/600/400" },
];

export default function Home() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <Hero />
      <ArticleSection title="Featured" href="/featured" articles={featured} featured={true} />
      <ArticleSection title="Künstliche Intelligenz" href="/ki-im-business" articles={kiBusiness} />
      <ArticleSection title="Future Tech" href="/future-tech" articles={futureTech} />
      <CTABanner />
      <Footer />
    </main>
  );
}
