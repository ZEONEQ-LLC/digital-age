import NewsTicker from "@/components/NewsTicker";
import HeroBold from "@/components/HeroBold";
import BentoGrid from "@/components/BentoGrid";
import SwissAIStrip from "@/components/SwissAIStrip";
import ArticleSection from "@/components/ArticleSection";
import CTAInverted from "@/components/CTAInverted";
import Footer from "@/components/Footer";
import {
  getFeaturedArticles,
  getArticlesByCategory,
} from "@/lib/articleApi";
import { articleToCard } from "@/lib/mappers/articleMappers";

const swissAI = [
  { name: "DeepJudge",      city: "Zürich", industry: "LegalTech" },
  { name: "LatticeFlow AI", city: "Zürich", industry: "AI Governance" },
  { name: "Unique AG",      city: "Zürich", industry: "FinTech" },
  { name: "Nexoya",         city: "Zürich", industry: "MarTech" },
  { name: "Scandit",        city: "Zürich", industry: "Logistics" },
];

export default async function Home() {
  const [featured, kiBusiness, futureTech] = await Promise.all([
    getFeaturedArticles(4),
    getArticlesByCategory("ki-business", 3),
    getArticlesByCategory("future-tech", 2),
  ]);

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <HeroBold />
      <BentoGrid articles={featured.map(articleToCard)} href="/ki-im-business" />
      <ArticleSection title="KI & Business" href="/ki-im-business" articles={kiBusiness.map(articleToCard)} />
      <SwissAIStrip items={swissAI} />
      <ArticleSection title="Future Tech" href="/future-tech" articles={futureTech.map(articleToCard)} />
      <CTAInverted />
      <Footer />
    </main>
  );
}
