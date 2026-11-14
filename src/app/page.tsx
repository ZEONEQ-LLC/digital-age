
import FocusRow from "@/components/home/FocusRow";
import HomeDateline from "@/components/home/HomeDateline";
import LeadStory from "@/components/home/LeadStory";
import NewsColumn from "@/components/home/NewsColumn";
import RubricBlock from "@/components/home/RubricBlock";
import ModuleSlot from "@/components/module/ModuleSlot";
import { getSlotReservation } from "@/lib/ads/slotReservation";
import SwissAIStrip from "@/components/SwissAIStrip";
import CTAInverted from "@/components/CTAInverted";
import Footer from "@/components/Footer";
import { getHomeArticles } from "@/lib/homeApi";
import { getLatestNews } from "@/lib/newsApi";
import { getPublishedStartups } from "@/lib/startupApi";
import { lookupSwissStatus } from "@/lib/mappers/startupMappers";
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

// ISR: Page wird statisch gerendert und alle 60s neu generiert.
// Greift nur, weil alle Data-Reads über den Anon-Public-Client laufen
// (kein cookies()-Aufruf).
export const revalidate = 60;

const HOME_NEWS_COUNT = 7;

export default async function Home() {
  // Startseite nach dem Design-Check (12.11.2026): Datumszeile, Aufmacher mit
  // News-Spalte, «Im Fokus», Billboard, zwei Rubriken mit je einem grossen und
  // drei kompakten Beitraegen, Swiss AI. Jeder Artikel hoechstens einmal
  // (homeApi.ts).
  const [home, news, startups, billboardReserve] = await Promise.all([
    getHomeArticles(),
    getLatestNews(HOME_NEWS_COUNT),
    getPublishedStartups(),
    // G3: Bild- oder Texthoehe fuer das Billboard serverseitig reservieren.
    getSlotReservation("home_billboard"),
  ]);
  const spotlight = [home.lead, ...home.focus].filter((a): a is NonNullable<typeof a> => !!a);

  // Swiss-AI-Strip: Top-5 published Startups (featured zuerst, dann nach
  // published_at desc — sortiert via getPublishedStartups). Klick auf eine
  // Card öffnet die jeweilige Startup-Detail-Page.
  const swissAI = startups.slice(0, SWISS_AI_STRIP_LIMIT).map((s) => ({
    name: s.name,
    city: s.city,
    industry: s.industry,
    href: `/swiss-ai/${s.slug}`,
    statusLabel: lookupSwissStatus(s.swiss_status).label,
    affiliated: !!s.affiliation_note?.trim(),
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
  // ItemList: Aufmacher und «Im Fokus», die ersten Inhalte der Startseite.
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
         
        dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
      />
      {spotlightItemList && (
        <script
          type="application/ld+json"
           
          dangerouslySetInnerHTML={{ __html: spotlightItemList }}
        />
      )}

      <HomeDateline />
      <style>{`
        .home-top { max-width: var(--max-content); margin: 0 auto; padding: 32px var(--gutter) 0; display: grid; grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr); gap: 40px; align-items: start; }
        @media (max-width: 1024px) { .home-top { grid-template-columns: minmax(0, 1fr); gap: 32px; } }
        @media (max-width: 640px) { .home-top { padding-top: 20px; } }
        .home-module-wrap { max-width: var(--max-content); margin: 0 auto; padding: 64px var(--gutter) 0; }
        @media (max-width: 768px) { .home-module-wrap { padding: 40px var(--gutter) 0; } }
      `}</style>
      <div className="home-top">
        {home.lead && <LeadStory article={home.lead} />}
        <NewsColumn items={news} />
      </div>
      <FocusRow articles={home.focus} />
      {/* Billboard: oben derselbe Abstand wie zwischen den Sektionen (64px, mobil 40px);
          unten nichts — die naechste Sektion bringt ihren eigenen Abstand mit. */}
      <div className="home-module-wrap">
        <ModuleSlot code="home_billboard" reserve={billboardReserve} />
      </div>
      <RubricBlock title="KI & Business" href="/ki-im-business" articles={home.kiBusiness} />
      <SwissAIStrip items={swissAI} />
      <RubricBlock title="Future Tech" href="/future-tech" articles={home.futureTech} />
      <CTAInverted />
      <Footer />
    </main>
  );
}
