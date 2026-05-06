"use client";

import { useMemo, useState } from "react";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import ListenLinks, { type ListenLinksMap } from "@/components/ListenLinks";
import EpisodeFeatured from "@/components/EpisodeFeatured";
import EpisodeCard from "@/components/EpisodeCard";
import type { Episode } from "@/types/episode";

const globalListenLinks: ListenLinksMap = {
  spotify:       "https://open.spotify.com/show/digital-age",
  applePodcasts: "https://podcasts.apple.com/show/digital-age",
  youtubeMusic:  "https://music.youtube.com/channel/digital-age",
  audible:       "https://www.audible.de/podcast/digital-age",
  soundcloud:    "https://soundcloud.com/digital-age",
};

const episodes: Episode[] = [
  {
    id: "ep-12",
    number: 12,
    title: "Wie Schweizer Banken KI wirklich einsetzen",
    description: "Andreas Kamm gibt einen seltenen Einblick in den AI-Stack einer Schweizer Grossbank: vom On-Premise-LLM für sensitive Daten bis zum agentischen Workflow im Kreditprozess. Ohne PR-Sprech.",
    cover: "https://picsum.photos/seed/podcast12/600",
    duration: 47,
    publishDate: "2026-04-10",
    category: "Banking & Finance",
    guest: { name: "Andreas Kamm", role: "Head of AI, Beispielbank" },
    listenLinks: {
      spotify:       "https://open.spotify.com/episode/12",
      applePodcasts: "https://podcasts.apple.com/episode/12",
      youtubeMusic:  "https://music.youtube.com/watch?v=ep12",
      audible:       "https://www.audible.de/podcast/digital-age/12",
    },
    showNotesUrl: "/podcasts/wie-schweizer-banken-ki-einsetzen",
    isLatest: true,
  },
  {
    id: "ep-11",
    number: 11,
    title: "EU AI Act — Was kommt auf uns zu?",
    description: "Der EU AI Act tritt schrittweise in Kraft. Was bedeutet das konkret für Schweizer Unternehmen mit EU-Bezug? Ali Soy entwirrt die Risk-Tiers und zeigt, was bereits jetzt zu tun ist.",
    cover: "https://picsum.photos/seed/podcast11/600",
    duration: 52,
    publishDate: "2026-04-03",
    category: "Regulierung",
    guest: { name: "Ali Soy", role: "Founder & CEO, digital age" },
    listenLinks: {
      spotify:       "https://open.spotify.com/episode/11",
      applePodcasts: "https://podcasts.apple.com/episode/11",
      youtubeMusic:  "https://music.youtube.com/watch?v=ep11",
    },
    showNotesUrl: "/podcasts/eu-ai-act-2026",
  },
  {
    id: "ep-10",
    number: 10,
    title: "Von OpenAI zu Swiss Hosted GPT",
    description: "Was kostet es, einen LLM-Stack in der Schweiz zu hosten — und wann lohnt es sich? Matthias Zwingli teilt Zahlen aus dem Aufbau einer Swiss-Hosted-Lösung.",
    cover: "https://picsum.photos/seed/podcast10/600",
    duration: 38,
    publishDate: "2026-03-27",
    category: "Swiss AI",
    guest: { name: "Matthias Zwingli", role: "CTO, Swisscom AI" },
    listenLinks: {
      spotify:       "https://open.spotify.com/episode/10",
      applePodcasts: "https://podcasts.apple.com/episode/10",
      youtubeMusic:  "https://music.youtube.com/watch?v=ep10",
      audible:       "https://www.audible.de/podcast/digital-age/10",
      soundcloud:    "https://soundcloud.com/digital-age/ep10",
    },
  },
  {
    id: "ep-09",
    number: 9,
    title: "Die Zukunft der Arbeit mit KI",
    description: "Welche Jobs verändert KI als Erstes — und welche neuen entstehen? Sarah Müller bringt Forschungsdaten statt Buzzwords.",
    cover: "https://picsum.photos/seed/podcast9/600",
    duration: 44,
    publishDate: "2026-03-20",
    category: "Future of Work",
    guest: { name: "Sarah Müller", role: "Future-of-Work Researcher, ETH Zürich" },
    listenLinks: {
      spotify:       "https://open.spotify.com/episode/9",
      applePodcasts: "https://podcasts.apple.com/episode/9",
      youtubeMusic:  "https://music.youtube.com/watch?v=ep9",
    },
    showNotesUrl: "/podcasts/zukunft-arbeit-mit-ki",
  },
  {
    id: "ep-08",
    number: 8,
    title: "IoT + AI — Die industrielle Revolution 4.0",
    description: "Predictive Maintenance, Smart Factories, Edge AI — wie Schweizer Industriebetriebe die nächste Welle bereits live haben.",
    cover: "https://picsum.photos/seed/podcast8/600",
    duration: 56,
    publishDate: "2026-03-13",
    category: "Industrie 4.0",
    guest: { name: "Ali Soy", role: "Founder & CEO, digital age" },
    listenLinks: {
      spotify:       "https://open.spotify.com/episode/8",
      applePodcasts: "https://podcasts.apple.com/episode/8",
      youtubeMusic:  "https://music.youtube.com/watch?v=ep8",
      audible:       "https://www.audible.de/podcast/digital-age/8",
    },
  },
  {
    id: "ep-07",
    number: 7,
    title: "KI-Regulierung aus Schweizer Sicht",
    description: "Die Schweiz wartet ab — bewusst. Dr. Peter Kaufmann erklärt, warum das ein Vorteil sein könnte und welche Pflichten trotzdem schon gelten.",
    cover: "https://picsum.photos/seed/podcast7/600",
    duration: 41,
    publishDate: "2026-03-06",
    category: "Regulierung",
    guest: { name: "Dr. Peter Kaufmann", role: "Rechtsanwalt, Tech & Regulation" },
    listenLinks: {
      spotify:       "https://open.spotify.com/episode/7",
      applePodcasts: "https://podcasts.apple.com/episode/7",
      youtubeMusic:  "https://music.youtube.com/watch?v=ep7",
    },
  },
];

const TAGS = ["Alle", "Banking & Finance", "Regulierung", "Industrie 4.0", "Future of Work", "Swiss AI", "Strategie"] as const;

export default function PodcastsPage() {
  const [tag, setTag]       = useState<(typeof TAGS)[number]>("Alle");
  const [search, setSearch] = useState("");

  const featured = episodes.find((e) => e.isLatest) ?? episodes[0];
  const rest = episodes.filter((e) => e.id !== featured.id);

  const filtered = useMemo(() => rest.filter((e) => {
    if (tag !== "Alle" && e.category !== tag) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !e.title.toLowerCase().includes(q) &&
        !(e.guest?.name.toLowerCase().includes(q) ?? false) &&
        !e.description.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [tag, search, rest]);

  const totalMinutes = episodes.reduce((acc, e) => acc + e.duration, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  const stats: Array<[string | number, string]> = [
    [episodes.length, "Folgen"],
    [`${totalHours}h`, "Content"],
    ["Wöchentlich", "Neue Folge"],
  ];

  const reset = () => { setTag("Alle"); setSearch(""); };

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />

      <style>{`
        .pc-shell { max-width: var(--max-content); margin: 0 auto; }
        .pc-hero {
          position: relative; overflow: hidden;
          border-bottom: 1px solid var(--da-border);
          padding: 56px var(--sp-8) 48px;
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
        .pc-hero__title em { font-style: normal; color: var(--da-green); }
        .pc-hero__lead {
          color: var(--da-muted); font-size: 17px; line-height: 1.65;
          max-width: 600px; margin-bottom: 32px;
        }

        .pc-stats {
          display: flex; gap: 32px; margin-bottom: 32px; flex-wrap: wrap;
        }
        .pc-stat__v {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 24px; font-weight: 700;
        }
        .pc-stat__l {
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
        }

        .pc-sub-label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 12px;
        }

        .pc-section { padding: 48px var(--sp-8) 0; }
        .pc-section-tight { padding: 56px var(--sp-8) 0; }

        .pc-section-h { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-6); }
        .pc-section-h__bar { width: 3px; height: 22px; background: var(--da-green); border-radius: 2px; }
        .pc-section-h__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 22px; font-weight: 700;
        }

        .pc-toolbar {
          display: flex; justify-content: space-between; align-items: center; gap: var(--sp-4);
          margin-bottom: var(--sp-6); flex-wrap: wrap;
        }
        .pc-pills { display: flex; gap: 6px; flex-wrap: wrap; }
        .pc-pill {
          background: var(--da-card); color: var(--da-muted);
          border: 1px solid var(--da-border); border-radius: var(--r-pill);
          padding: 7px 13px;
          font-size: 12px; font-weight: 600;
          cursor: pointer;
          transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
        }
        .pc-pill:hover { color: var(--da-text); border-color: var(--da-muted-soft); }
        .pc-pill--active {
          background: var(--da-green);
          color: var(--da-dark);
          border-color: var(--da-green);
        }
        .pc-pill__count {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          margin-left: 4px;
        }
        .pc-pill--active .pc-pill__count { color: var(--da-dark); opacity: 0.65; }

        .pc-search {
          background: var(--da-card); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: var(--r-sm);
          padding: 9px 14px; font-size: 13px; width: 220px;
        }
        .pc-search:focus { border-color: var(--da-green); outline: none; }

        .pc-list { display: flex; flex-direction: column; gap: 10px; }

        .pc-empty { text-align: center; padding: 60px 0; }
        .pc-empty__msg { color: var(--da-muted); font-size: 15px; }
        .pc-empty__btn {
          display: block; margin: 16px auto 0;
          background: none; border: 1px solid var(--da-green);
          color: var(--da-green); padding: 9px 20px;
          border-radius: var(--r-sm); font-size: 13px; cursor: pointer;
        }

        @media (max-width: 720px) {
          .pc-hero { padding: 40px var(--sp-6) 32px; }
          .pc-search { width: 100%; }
          .pc-toolbar { flex-direction: column; align-items: stretch; }
        }
      `}</style>

      {/* Hero */}
      <section className="pc-hero">
        <div className="pc-hero__grid" aria-hidden />
        <div className="pc-shell pc-hero__inner">
          <p className="pc-hero__overline">&gt; Media</p>
          <h1 className="pc-hero__title">digital age <em>Podcast</em></h1>
          <p className="pc-hero__lead">
            Gespräche mit Expertinnen und Experten aus der KI- und Tech-Szene der DACH-Region. Ohne PR-Sprech.
          </p>

          <div className="pc-stats">
            {stats.map(([v, l]) => (
              <div key={l}>
                <div className="pc-stat__v">{v}</div>
                <div className="pc-stat__l">{l}</div>
              </div>
            ))}
          </div>

          <div>
            <p className="pc-sub-label">Abonnieren auf</p>
            <ListenLinks links={globalListenLinks} size="md" />
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="pc-shell pc-section">
        <EpisodeFeatured episode={featured} />
      </section>

      {/* All episodes */}
      <section className="pc-shell pc-section-tight">
        <div className="pc-section-h">
          <span className="pc-section-h__bar" />
          <h2 className="pc-section-h__title">Alle Folgen</h2>
        </div>

        <div className="pc-toolbar">
          <div className="pc-pills">
            {TAGS.map((t) => {
              const count = t === "Alle" ? rest.length : rest.filter((e) => e.category === t).length;
              if (t !== "Alle" && count === 0) return null;
              const active = t === tag;
              return (
                <button
                  key={t}
                  type="button"
                  className={`pc-pill${active ? " pc-pill--active" : ""}`}
                  onClick={() => setTag(t)}
                >
                  {t}
                  <span className="pc-pill__count">{count}</span>
                </button>
              );
            })}
          </div>
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pc-search"
            aria-label="Folgen durchsuchen"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="pc-empty">
            <p className="pc-empty__msg">Keine Folgen gefunden.</p>
            <button type="button" className="pc-empty__btn" onClick={reset}>Filter zurücksetzen</button>
          </div>
        ) : (
          <div className="pc-list">
            {filtered.map((ep) => <EpisodeCard key={ep.id} episode={ep} />)}
          </div>
        )}
      </section>

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
