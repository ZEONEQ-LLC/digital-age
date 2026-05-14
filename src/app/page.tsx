import NewsTicker from "@/components/NewsTicker";
import HeroBold from "@/components/HeroBold";
import SpotlightSection from "@/components/SpotlightSection";
import SwissAIStrip from "@/components/SwissAIStrip";
import ArticleSection from "@/components/ArticleSection";
import CTAInverted from "@/components/CTAInverted";
import Footer from "@/components/Footer";
import {
  getArticlesByCategory,
  getHeroOrLatestByCategory,
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
  // BentoGrid (Featured-Section) entfernt — die Spotlight-Section deckt das
  // Hero-Featuring ab. Kategorie-Sections filtern Hero-Artikel raus damit
  // jeder Artikel max einmal auf der Homepage erscheint.
  const [kiBusiness, futureTech, heroKi, heroFt] = await Promise.all([
    getArticlesByCategory("ki-business", 3, { excludeHero: true }),
    getArticlesByCategory("future-tech", 2, { excludeHero: true }),
    getHeroOrLatestByCategory("ki-business"),
    getHeroOrLatestByCategory("future-tech"),
  ]);

  // Spotlight: 1 Hero (oder Fallback-Neueste) pro Kategorie.
  const spotlight = [heroKi, heroFt].filter(
    (a): a is NonNullable<typeof a> => !!a,
  );

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <HeroBold />
      <SpotlightSection articles={spotlight} />
      <ArticleSection title="KI & Business" href="/ki-im-business" articles={kiBusiness.map(articleToCard)} />
      <SwissAIStrip items={swissAI} />
      <ArticleSection title="Future Tech" href="/future-tech" articles={futureTech.map(articleToCard)} />
      <CTAInverted />
      <Footer />
    </main>
  );
}
