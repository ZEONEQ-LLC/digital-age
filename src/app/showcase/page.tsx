import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";
import HubHero from "@/components/HubHero";
import ShowcaseBrowser from "@/components/showcase/ShowcaseBrowser";
import { SHOWCASE_PATH } from "@/lib/contentType";
import { buildItemListJsonLd } from "@/lib/jsonLd";
import { buildListingMetadata } from "@/lib/listingMetadata";
import { getShowcaseArticles, getShowcaseCount, showcaseToListRow } from "@/lib/showcaseApi";
import { getBaseUrl } from "@/lib/siteUrl";
import { RULES_PATH } from "@/lib/startupTrust";

// Uebersicht der Unternehmensbeitraege (Showcase, S2b). Jede Zeile traegt die
// Kennzeichnung und den Absender; die Einordnung steht links neben der Liste.

export const revalidate = 300;

// Solange es keinen Beitrag gibt, gehoert die leere Seite nicht in den Index
// (die Sitemap fuehrt sie dann auch nicht).
export async function generateMetadata(): Promise<Metadata> {
  const base = buildListingMetadata({
    path: SHOWCASE_PATH,
    title: "Showcase: Beiträge von Schweizer KI-Unternehmen",
    description:
      "Unternehmen aus dem Swiss-AI-Verzeichnis schreiben über ihre Arbeit. Alle Beiträge sind als Unternehmensbeitrag oder Publireportage gekennzeichnet und stammen nicht von der Redaktion.",
  });
  const count = await getShowcaseCount();
  return count > 0 ? base : { ...base, robots: { index: false, follow: true } };
}

export default async function ShowcasePage() {
  const articles = await getShowcaseArticles();
  const rows = articles.map(showcaseToListRow);
  const baseUrl = getBaseUrl();
  const itemListJsonLd = buildItemListJsonLd({
    name: "Showcase: Beiträge von Schweizer KI-Unternehmen",
    items: articles.map((a) => ({ url: `${baseUrl}${SHOWCASE_PATH}/${a.slug}`, name: a.title })),
  });

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      {articles.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJsonLd }} />
      )}
      <HubHero
        title="Showcase"
        claim="Unternehmen aus dem Verzeichnis über ihre Arbeit"
        accent="var(--da-orange)"
        action={<Link href={`${RULES_PATH}#showcase`} className="hh-btn">Regeln</Link>}
      />
      <ShowcaseBrowser rows={rows} />
      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
