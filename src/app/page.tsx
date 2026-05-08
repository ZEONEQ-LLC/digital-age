import NewsTicker from "@/components/NewsTicker";
import HeroBold from "@/components/HeroBold";
import BentoGrid from "@/components/BentoGrid";
import SwissAIStrip from "@/components/SwissAIStrip";
import ArticleSection from "@/components/ArticleSection";
import CTAInverted from "@/components/CTAInverted";
import Footer from "@/components/Footer";

const bentoArticles = [
  { category: "Swiss Hosted GPT", title: "Fünf versteckte Risiken bei der Nutzung der falschen KI für Unternehmen", author: "Matthias Zwingli", date: "16.04.2025", image: "https://picsum.photos/seed/ki1/1200/700", href: "/artikel/swiss-hosted-gpt" },
  { category: "AI in Banking",    title: "Data-Driven Banking: Why AI Alone Won't Fix the Real Problem",          author: "Andreas Kamm",     date: "07.04.2026", image: "https://picsum.photos/seed/bank1/700/500", href: "/artikel/data-driven-banking" },
  { category: "KI im Business",   title: "Edge-AI im Mittelstand: Ein Praxisbericht aus drei Pilotprojekten",     author: "Marc Keller",      date: "02.04.2026", image: "https://picsum.photos/seed/extguest1/700/500", href: "/artikel/gastbeitrag-edge-ai-mittelstand", external: true },
  { category: "EU AI Act",        title: "EU AI-Act: Was Schweizer Unternehmen unbedingt wissen und tun müssen",    author: "Ali Soy",          date: "03.04.2025", image: "https://picsum.photos/seed/ki2/700/500", href: "/artikel/eu-ai-act" },
  { category: "Blockchain",       title: "Blockchain of Things",                                                   author: "Ali Soy",          date: "23.01.2025", image: "https://picsum.photos/seed/block1/700/500", href: "/artikel/blockchain-of-things" },
];

const swissAI = [
  { name: "DeepJudge",      city: "Zürich", industry: "LegalTech" },
  { name: "LatticeFlow AI", city: "Zürich", industry: "AI Governance" },
  { name: "Unique AG",      city: "Zürich", industry: "FinTech" },
  { name: "Nexoya",         city: "Zürich", industry: "MarTech" },
  { name: "Scandit",        city: "Zürich", industry: "Logistics" },
];

const futureTech = [
  { category: "GenAI",      title: "IoT-Geräte vernetzen mit AI – aber richtig: Warum OpenAI API nicht die Lösung ist",  author: "Ali Soy", date: "10.02.2025", image: "https://picsum.photos/seed/iot1/600/400" },
  { category: "Robotics",   title: "Autonome Lagerroboter: Was im Schweizer KMU funktioniert",                            author: "Lena Vogt", date: "20.02.2026", image: "https://picsum.photos/seed/extguest2/600/400", href: "/artikel/gastbeitrag-autonome-lagerroboter", external: true },
  { category: "Blockchain", title: "Blockchain of Things",                                                                  author: "Ali Soy", date: "23.01.2021", image: "https://picsum.photos/seed/block1/600/400" },
];

export default function Home() {
  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <HeroBold />
      <BentoGrid articles={bentoArticles} href="/ki-im-business" />
      <SwissAIStrip items={swissAI} />
      <ArticleSection title="Future Tech" href="/future-tech" articles={futureTech} />
      <CTAInverted />
      <Footer />
    </main>
  );
}
