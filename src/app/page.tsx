
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
import { getPublishedStartups } from "@/lib/startupApi";

const SWISS_AI_STRIP_LIMIT = 5;

export default async function Home() {
  // BentoGrid (Featured-Section) entfernt — die Spotlight-Section deckt das
  // Hero-Featuring ab. Kategorie-Sections filtern Hero-Artikel raus damit
  // jeder Artikel max einmal auf der Homepage erscheint.
  const [kiBusiness, futureTech, heroKi, heroFt, startups] = await Promise.all([
    getArticlesByCategory("ki-business", 3, { excludeHero: true }),
    getArticlesByCategory("future-tech", 3, { excludeHero: true }),
    getHeroOrLatestByCategory("ki-business"),
    getHeroOrLatestByCategory("future-tech"),
    getPublishedStartups(),
  ]);

  // Spotlight: 1 Hero (oder Fallback-Neueste) pro Kategorie.
  const spotlight = [heroKi, heroFt].filter(
    (a): a is NonNullable<typeof a> => !!a,
  );

  // Swiss-AI-Strip: Top-5 published Startups (featured zuerst, dann nach
  // published_at desc — sortiert via getPublishedStartups). Klick auf eine
  // Card öffnet die jeweilige Startup-Detail-Page.
  const swissAI = startups.slice(0, SWISS_AI_STRIP_LIMIT).map((s) => ({
    name: s.name,
    city: s.city,
    industry: s.industry,
    href: `/swiss-ai/${s.slug}`,
  }));

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>

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
