
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
import { buildListingMetadata } from "@/lib/listingMetadata";
import { getBaseUrl } from "@/lib/siteUrl";
import {
  buildWebsiteJsonLd,
  buildOrganizationJsonLd,
  buildItemListJsonLd,
} from "@/lib/jsonLd";

const SWISS_AI_STRIP_LIMIT = 5;

const SITE_NAME = "digital age";
const SITE_DESCRIPTION =
  "Nachrichten, Analysen und Empfehlungen rund um Künstliche Intelligenz und Future Tech. Schweizer Perspektive für Entscheider und Praktiker.";
const OG_FALLBACK_PATH = "/images/digital-age-og-fallback.jpg";
// Brand-Social: aktuell nur LinkedIn (siehe Footer); X/Mastodon/Instagram
// existieren nicht. Schema.sameAs enthält daher genau eine URL.
const BRAND_SAME_AS = [
  "https://www.linkedin.com/company/digital-age-schweiz",
];

export const metadata = buildListingMetadata({
  path: "/",
  title: "digital age — Magazin für KI, Future Tech und Tools",
  description:
    "Nachrichten, Analysen und Empfehlungen rund um Künstliche Intelligenz und Future Tech. Schweizer Perspektive für Entscheider und Praktiker.",
});

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

  const baseUrl = getBaseUrl();
  const websiteJsonLd = buildWebsiteJsonLd({
    baseUrl,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
  });
  const organizationJsonLd = buildOrganizationJsonLd({
    baseUrl,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    logoPath: OG_FALLBACK_PATH,
    sameAs: BRAND_SAME_AS,
  });
  // ItemList: Spotlight-Articles (Hero pro Kategorie). Klein und
  // SEO-relevant — die Section ist die erste Content-Einheit auf der Home.
  const spotlightItemList =
    spotlight.length > 0
      ? buildItemListJsonLd({
          name: "Spotlight",
          items: spotlight.map((a) => ({
            url: `${baseUrl}/artikel/${a.slug}`,
            name: a.title,
          })),
        })
      : null;

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
      />
      {spotlightItemList && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: spotlightItemList }}
        />
      )}

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
