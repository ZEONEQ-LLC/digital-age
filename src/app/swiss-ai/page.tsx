import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import {
  getPublishedStartups,
  getFeaturedStartups,
  getStartupIndustries,
  getStartupCities,
} from "@/lib/startupApi";
import { startupToCardVM } from "@/lib/mappers/startupMappers";
import StartupsBrowser from "./StartupsBrowser";

export default async function SwissAIPage() {
  const [allRows, featuredRows, industries, cities] = await Promise.all([
    getPublishedStartups(),
    getFeaturedStartups(),
    getStartupIndustries(),
    getStartupCities(),
  ]);
  const all = allRows.map(startupToCardVM);
  const featured = featuredRows.map(startupToCardVM);

  const stats = [
    { n: `${all.length}+`, l: "Unternehmen" },
    { n: `${cities.length}`, l: "Städte" },
    { n: `${industries.length}`, l: "Branchen" },
    { n: "100%", l: "Schweizer Bezug" },
  ];

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />

      <style>{`
        .sa-hero {
          position: relative; overflow: hidden;
          border-bottom: 1px solid var(--da-border);
        }
        .sa-hero__bg { position: absolute; inset: 0; display: flex; opacity: 0.07; pointer-events: none; }
        .sa-hero__bg-bar { flex: 1; }
        .sa-hero__bg-bar:nth-child(odd)  { background: var(--da-green); }
        .sa-hero__bg-bar:nth-child(even) { background: var(--da-card); }
        .sa-hero__overlay {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(135deg, var(--da-dark) 0%, rgba(28,28,30,0.92) 100%);
        }
        .sa-hero__inner {
          position: relative;
          padding: 64px var(--sp-8) 56px;
          max-width: var(--max-content); margin: 0 auto;
        }
        .sa-hero__row {
          display: grid; grid-template-columns: 1fr auto;
          gap: 48px; align-items: center;
        }
        .sa-hero__overline {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
          margin-bottom: var(--sp-4);
        }
        .sa-hero__title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: clamp(36px, 5vw, 60px); font-weight: 700;
          line-height: 1.05; letter-spacing: -0.02em;
          margin-bottom: var(--sp-5);
        }
        .sa-hero__title em { font-style: normal; color: var(--da-green); }
        .sa-hero__lead {
          color: var(--da-muted); font-size: 17px; line-height: 1.7;
          max-width: 600px; margin-bottom: 36px;
        }
        .sa-hero__cta-row { display: flex; gap: var(--sp-3); flex-wrap: wrap; }
        .sa-hero__cta-primary {
          background: var(--da-green); color: var(--da-dark);
          font-size: 14px; font-weight: 700; padding: 13px 28px;
          border-radius: var(--r-sm); text-decoration: none;
        }
        .sa-hero__cta-secondary {
          background: none; color: var(--da-orange);
          border: 2px solid var(--da-orange);
          font-size: 14px; font-weight: 600; padding: 11px 28px;
          text-decoration: none;
          transition: background var(--t-base), color var(--t-base);
        }
        .sa-hero__cta-secondary:hover {
          background: var(--da-orange); color: var(--da-dark);
        }

        .sa-stats { display: flex; flex-direction: column; gap: 1px; }
        .sa-stat {
          padding: 20px 28px; background: rgba(42,42,46,0.6);
          border-bottom: 1px solid var(--da-border);
          display: flex; align-items: center; gap: var(--sp-4);
        }
        .sa-stat__n {
          color: var(--da-green); font-size: 28px; font-weight: 700;
          font-family: var(--da-font-display); min-width: 72px;
        }
        .sa-stat__l { color: var(--da-muted); font-size: 13px; }

        @media (max-width: 1024px) {
          .sa-hero__row { grid-template-columns: 1fr; gap: var(--sp-8); }
        }
        @media (max-width: 720px) {
          .sa-hero__inner { padding: 48px var(--sp-6) 40px; }
        }
      `}</style>

      <section className="sa-hero">
        <div className="sa-hero__bg" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="sa-hero__bg-bar" />)}
        </div>
        <div className="sa-hero__overlay" aria-hidden />
        <div className="sa-hero__inner">
          <div className="sa-hero__row">
            <div>
              <p className="sa-hero__overline">🇨🇭 Swiss AI Landscape</p>
              <h1 className="sa-hero__title">
                Die Schweizer KI-Landschaft —<br />
                <em>an einem Ort.</em>
              </h1>
              <p className="sa-hero__lead">
                Kuratierte Übersicht von KI-Unternehmen mit Sitz oder Präsenz in der Schweiz. Finde die passende Lösung — mit Fokus auf Datenschutz und Schweizer Werte.
              </p>
              <div className="sa-hero__cta-row">
                <a href="#directory" className="sa-hero__cta-primary">Verzeichnis durchsuchen</a>
                <Link href="/swiss-ai/einreichen" className="sa-hero__cta-secondary">Unternehmen einreichen →</Link>
              </div>
            </div>
            <div className="sa-stats">
              {stats.map(({ n, l }) => (
                <div key={l} className="sa-stat">
                  <span className="sa-stat__n">{n}</span>
                  <span className="sa-stat__l">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <StartupsBrowser
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
