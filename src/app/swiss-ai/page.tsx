import Link from "next/link";
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
        title="Swiss AI"
        claim="Schweizer KI-Unternehmen im Verzeichnis"
        mobileInset="var(--sp-8)"
        action={<Link href="/swiss-ai/einreichen" className="hh-btn hh-btn--accent">+ Unternehmen eintragen</Link>}
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
