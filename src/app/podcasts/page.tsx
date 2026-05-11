import Footer from "@/components/Footer";
import NewsTicker from "@/components/NewsTicker";
import PodcastsFilterList from "@/components/PodcastsFilterList";
import { getPublishedPodcasts } from "@/lib/podcastApi";
import { podcastToCardVM } from "@/lib/mappers/podcastMappers";

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
      <NewsTicker />

      <style>{`
        .pc-shell { max-width: var(--max-content); margin: 0 auto; }

        .pc-hero {
          position: relative; overflow: hidden;
          border-bottom: 1px solid var(--da-border);
          padding: 56px var(--sp-8) 40px;
        }
        .pc-hero__grid {
          position: absolute; inset: 0; opacity: 0.05;
          background-image:
            linear-gradient(var(--da-green) 1px, transparent 1px),
            linear-gradient(90deg, var(--da-green) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .pc-hero__inner { position: relative; }
        .pc-hero__overline {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
          margin-bottom: 14px;
        }
        .pc-hero__title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: clamp(36px, 5vw, 56px); font-weight: 700;
          line-height: 1.0; letter-spacing: -0.02em;
          margin-bottom: var(--sp-4);
        }
        .pc-hero__lead {
          color: var(--da-muted); font-size: 17px; line-height: 1.65;
          max-width: 640px;
        }
        .pc-hero__stats {
          display: flex; gap: 14px; flex-wrap: wrap;
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 12px; font-weight: 600;
          margin-top: 20px;
        }
        .pc-hero__stats strong { color: var(--da-text); font-weight: 700; }
        @media (max-width: 720px) {
          .pc-hero { padding: 40px var(--sp-6) 28px; }
        }
      `}</style>

      <section className="pc-hero">
        <div className="pc-hero__grid" aria-hidden />
        <div className="pc-shell pc-hero__inner">
          <p className="pc-hero__overline">&gt; Empfohlene Hör-Erlebnisse</p>
          <h1 className="pc-hero__title">Podcasts</h1>
          <p className="pc-hero__lead">
            Empfehlungen aus unserer Redaktion und von unseren Autoren — handverlesen und kommentiert.
          </p>
          <div className="pc-hero__stats">
            <span><strong>{podcasts.length}</strong> {podcasts.length === 1 ? "Folge" : "Folgen"}</span>
            <span>·</span>
            <span><strong>{usedLanguages.size}</strong> {usedLanguages.size === 1 ? "Sprache" : "Sprachen"}</span>
            <span>·</span>
            <span><strong>{availableCategories.length}</strong> {availableCategories.length === 1 ? "Kategorie" : "Kategorien"}</span>
          </div>
        </div>
      </section>

      <PodcastsFilterList podcasts={podcasts} availableCategories={availableCategories} />

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
