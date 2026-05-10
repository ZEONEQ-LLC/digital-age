import NewsTicker from "@/components/NewsTicker";
import HeroBold from "@/components/HeroBold";
import BentoGrid from "@/components/BentoGrid";
import SwissAIStrip from "@/components/SwissAIStrip";
import ArticleSection from "@/components/ArticleSection";
import CTAInverted from "@/components/CTAInverted";
import Footer from "@/components/Footer";

const bentoArticles = [
  { category: "AI in Banking",    title: "Data-Driven Banking: Warum KI allein das eigentliche Problem nicht löst", author: "Andreas Kamm",     date: "07.04.2026", image: "https://picsum.photos/seed/bank1/1200/700", href: "/artikel/data-driven-banking" },
  { category: "KI im Business",   title: "Wie Schweizer KMU bei Edge-AI vorne dabei sind",                          author: "Ali Soy",          date: "28.04.2026", image: "https://picsum.photos/seed/article1/700/500", href: "/artikel/schweizer-kmu-edge-ai" },
  { category: "KI im Business",   title: "Edge-AI im Mittelstand: Ein Praxisbericht aus drei Pilotprojekten",       author: "Marc Keller",      date: "02.04.2026", image: "https://picsum.photos/seed/extguest1/700/500", href: "/artikel/gastbeitrag-edge-ai-mittelstand", external: true },
  { category: "Future of Work",   title: "Die Zukunft der Arbeit: Augmentation statt Automation",                    author: "Ali Soy",          date: "15.04.2026", image: "https://picsum.photos/seed/article5/700/500", href: "/artikel/zukunft-arbeit-augmentation" },
];

const swissAI = [
  { name: "DeepJudge",      city: "Zürich", industry: "LegalTech" },
  { name: "LatticeFlow AI", city: "Zürich", industry: "AI Governance" },
  { name: "Unique AG",      city: "Zürich", industry: "FinTech" },
  { name: "Nexoya",         city: "Zürich", industry: "MarTech" },
  { name: "Scandit",        city: "Zürich", industry: "Logistics" },
];

// TODO Phase 7+: replace with Supabase query (articles where category = "ki-business" order by published_at desc limit 3).
const kiBusiness = [
  { category: "AI in Banking", title: "AI Co-Pilots in Banking: Wie Relationship Manager im Lead bleiben", author: "Andreas Kamm",     date: "31.03.2026", image: "https://picsum.photos/seed/bank3/600/400", href: "/ki-im-business" },
  { category: "KI-Strategie",  title: "Warum 80% der KI-Projekte scheitern — und wie Ihr Unternehmen zu den 20% gehört", author: "Matthias Zwingli", date: "22.03.2026", image: "https://picsum.photos/seed/strat1/600/400", href: "/ki-im-business" },
  { category: "KI-Strategie",  title: "Make or Buy: Wann lohnt sich eine eigene KI-Infrastruktur?",        author: "Ali Soy",          date: "15.03.2026", image: "https://picsum.photos/seed/strat2/600/400", href: "/ki-im-business" },
];

const futureTech = [
  { category: "GenAI",      title: "IoT-Geräte vernetzen mit AI – aber richtig: Warum OpenAI API nicht die Lösung ist",  author: "Ali Soy", date: "10.02.2025", image: "https://picsum.photos/seed/iot1/600/400" },
  { category: "Blockchain", title: "Blockchain of Things",                                                                  author: "Ali Soy", date: "23.01.2021", image: "https://picsum.photos/seed/block1/600/400" },
];

export default function Home() {
  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <HeroBold />
      <BentoGrid articles={bentoArticles} href="/ki-im-business" />
      <ArticleSection title="KI & Business" href="/ki-im-business" articles={kiBusiness} />
      <SwissAIStrip items={swissAI} />
      <ArticleSection title="Future Tech" href="/future-tech" articles={futureTech} />
      <CTAInverted />
      <Footer />
    </main>
  );
}
