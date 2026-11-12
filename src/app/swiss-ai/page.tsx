import Footer from "@/components/Footer";
import HubHero from "@/components/HubHero";
import {
  getPublishedStartups,
  getFeaturedStartups,
  getStartupIndustries,
  getStartupCities,
} from "@/lib/startupApi";
import { startupToCardVM } from "@/lib/mappers/startupMappers";
import StartupsBrowser from "./StartupsBrowser";
import { buildListingMetadata } from "@/lib/listingMetadata";
import { getSlotReservation } from "@/lib/ads/slotReservation";
import { buildItemListJsonLd } from "@/lib/jsonLd";
import { getBaseUrl } from "@/lib/siteUrl";

export const revalidate = 300;

export const metadata = buildListingMetadata({
  path: "/swiss-ai",
  title: "Swiss AI — Schweizer KI-Unternehmen im Verzeichnis",
  description:
    "Über 50 Schweizer KI-Unternehmen im kuratierten Verzeichnis: von Forschungs-Spin-offs bis Industrie-Anwender, mit Standort, Branche und Investor-Signal.",
});

export default async function SwissAIPage() {
  const [allRows, featuredRows, industries, cities] = await Promise.all([
    getPublishedStartups(),
    getFeaturedStartups(),
    getStartupIndustries(),
    getStartupCities(),
  ]);
  const all = allRows.map(startupToCardVM);
  const featured = featuredRows.map(startupToCardVM);

  const moduleReserve = await getSlotReservation("swiss_ai_sidebar");

  // SEO N4: ItemList wie auf den anderen Listings (/ki-im-business, /tag).
  const baseUrl = getBaseUrl();
  const itemListJsonLd = buildItemListJsonLd({
    name: "Swiss AI — Schweizer KI-Unternehmen",
    items: all.map((s) => ({ url: `${baseUrl}/swiss-ai/${s.slug}`, name: s.name })),
  });

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJsonLd }} />


      <HubHero
        mobileInset="var(--sp-8)"
        overline="🇨🇭 Swiss AI Landscape"
        title={<>Swiss <em>AI</em></>}
        lead="Die Schweizer KI-Landschaft an einem Ort: kuratierte Übersicht von KI-Unternehmen mit Sitz oder Präsenz in der Schweiz, mit Fokus auf Datenschutz und Schweizer Werte."
        stats={[
          { value: all.length, label: "Unternehmen" },
          { value: cities.length, label: cities.length === 1 ? "Stadt" : "Städte" },
          { value: industries.length, label: industries.length === 1 ? "Branche" : "Branchen" },
        ]}
      />

      <StartupsBrowser
        moduleReserve={moduleReserve}
        all={all}
        featured={featured}
        industries={industries}
        cities={cities}
      />

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
