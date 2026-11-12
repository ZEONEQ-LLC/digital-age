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

  const usedLanguages = new Set(podcasts.map((p) => p.language));
  const categorySet = new Set<string>();
  for (const p of podcasts) {
    if (p.category) categorySet.add(p.category);
  }
  const availableCategories = Array.from(categorySet).sort();

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      


      <HubHero
        mobileInset="var(--sp-6)"
        overline="Empfohlene Hör-Erlebnisse"
        title={<>KI-<em>Podcasts</em></>}
        lead="Empfehlungen aus unserer Redaktion und von unseren Autoren — handverlesen und kommentiert."
        stats={[
          { value: podcasts.length, label: podcasts.length === 1 ? "Folge" : "Folgen" },
          { value: usedLanguages.size, label: usedLanguages.size === 1 ? "Sprache" : "Sprachen" },
          { value: availableCategories.length, label: availableCategories.length === 1 ? "Kategorie" : "Kategorien" },
        ]}
      />

      <PodcastsFilterList podcasts={podcasts} availableCategories={availableCategories} />

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
