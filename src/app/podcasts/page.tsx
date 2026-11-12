import Footer from "@/components/Footer";
import HubHero from "@/components/HubHero";

import PodcastsFilterList from "@/components/PodcastsFilterList";
import { getPublishedPodcasts } from "@/lib/podcastApi";
import { podcastToCardVM } from "@/lib/mappers/podcastMappers";
import { buildListingMetadata } from "@/lib/listingMetadata";

export const revalidate = 300;

export const metadata = buildListingMetadata({
  path: "/podcasts",
  title: "KI-Podcasts — Empfehlungen der digital-age-Redaktion",
  description:
    "Hörens-werte Podcasts zu Künstlicher Intelligenz und Future Tech: kuratiert von der digital-age-Redaktion, mit Apple- und Spotify-Direktlinks.",
});

export default async function PodcastsPage() {
  const rows = await getPublishedPodcasts();
  const podcasts = rows.map(podcastToCardVM);

  const categorySet = new Set<string>();
  for (const p of podcasts) {
    if (p.category) categorySet.add(p.category);
  }
  const availableCategories = Array.from(categorySet).sort();

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      


      <HubHero
        title="Podcasts"
        claim="Hörenswertes zu KI, ausgewählt von der Redaktion"
      />

      <PodcastsFilterList podcasts={podcasts} availableCategories={availableCategories} />

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
