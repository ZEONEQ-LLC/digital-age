import Link from "next/link";
import Footer from "@/components/Footer";
import HubHero from "@/components/HubHero";
import { buildListingMetadata } from "@/lib/listingMetadata";
import {
  NEWS_CATEGORY_LABEL,
  getLatestNews,
  newsClock,
  newsDayDate,
  newsDayLabel,
  zurichDay,
  type NewsItem,
} from "@/lib/newsApi";

// News-Rubrik (Wunsch Ali 12.11.2026): die Meldungen des Tickers zum Lesen,
// nach Tagen gruppiert, jeweils mit Kurzfassung und Link zur Quelle. Die
// Kurzfassungen schreibt die KI des Tickers (newsTicker/generator.ts).

export const revalidate = 300;

export const metadata = buildListingMetadata({
  path: "/news",
  title: "News — KI und Future Tech, kurz zusammengefasst",
  description:
    "Die wichtigsten Meldungen zu Künstlicher Intelligenz und Future Tech, täglich kurz zusammengefasst und mit Link zur Originalquelle.",
});

const LIMIT = 150;
const WINDOW_DAYS = 30;
const MIN_ITEMS = 10;

function groupByDay(items: NewsItem[]): [string, NewsItem[]][] {
  const map = new Map<string, NewsItem[]>();
  for (const it of items) {
    const day = zurichDay(it.publishedAt);
    const list = map.get(day) ?? [];
    list.push(it);
    map.set(day, list);
  }
  return Array.from(map.entries());
}

// Zeitpunkt des Renderns (ISR): bewusst ausserhalb der Komponente.
function renderedAt(): Date {
  return new Date();
}

export default async function NewsPage() {
  const now = renderedAt();
  const all = await getLatestNews(LIMIT);
  // Nur der letzte Monat; steht der Ticker laenger, bleiben die neuesten zehn.
  const recent = all.filter((it) => now.getTime() - new Date(it.publishedAt).getTime() <= WINDOW_DAYS * 86_400_000);
  const items = recent.length >= MIN_ITEMS ? recent : all.slice(0, MIN_ITEMS);
  const days = groupByDay(items);

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <style>{`
        /* Aufbau wie ein Newsticker (Heise, NZZ): Tageskopf, links die Uhrzeit,
           rechts Titel, Kurzfassung und Quelle. Ruhig: keine Versalien-Labels,
           keine Punkte, Quelle als dezenter Link (Feinschliff PR 198). */
        .nw-wrap { max-width: var(--max-content); margin: 0 auto; padding: var(--sp-10) var(--gutter) var(--sp-20); }
        .nw-inner { max-width: 780px; }
        .nw-note { color: var(--da-muted-soft); font-size: 13px; line-height: 1.6; margin: 0 0 var(--sp-10); max-width: 640px; }
        .nw-note a { color: var(--da-muted); }
        .nw-day + .nw-day { margin-top: var(--sp-12); }
        .nw-day-h {
          display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
          margin: 0 0 var(--sp-2); padding-bottom: 12px; border-bottom: 2px solid var(--da-text);
          color: var(--da-text); font-family: var(--da-font-display); font-size: 22px; font-weight: 700; letter-spacing: -0.01em;
        }
        .nw-day-h small { color: var(--da-muted); font-family: var(--da-font-body); font-size: 15px; font-weight: 400; letter-spacing: 0; }
        .nw-item {
          display: grid; grid-template-columns: 56px minmax(0, 1fr); column-gap: var(--sp-4);
          padding: 18px 0 20px; border-bottom: 1px solid var(--da-border);
          scroll-margin-top: calc(var(--nav-h) + 56px);
        }
        .nw-item:target { background: rgba(50,255,126,0.05); box-shadow: -12px 0 0 rgba(50,255,126,0.05), 12px 0 0 rgba(50,255,126,0.05); }
        .nw-time { color: var(--da-green); font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.45; }
        .nw-title { color: var(--da-text); font-size: 19px; font-weight: 600; line-height: 1.38; letter-spacing: -0.005em; margin: 0; }
        .nw-summary { color: #c4c4c4; font-size: 16px; line-height: 1.62; margin: 8px 0 0; }
        .nw-meta { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-top: 10px; font-size: 13px; color: var(--da-muted-soft); }
        .nw-src { color: var(--da-muted); font-weight: 600; text-decoration: none; }
        .nw-src:hover { color: var(--da-green); text-decoration: underline; text-underline-offset: 3px; }
        .nw-empty { color: var(--da-muted); font-size: 15px; }
        @media (max-width: 640px) {
          .nw-item { grid-template-columns: 46px minmax(0, 1fr); column-gap: 10px; }
          .nw-time { font-size: 14px; }
          .nw-title { font-size: 17px; }
          .nw-summary { font-size: 15px; }
          .nw-day-h { font-size: 20px; }
        }
      `}</style>
      <HubHero title="News" claim="Meldungen zu KI und Future Tech, kurz zusammengefasst" />
      <div className="nw-wrap"><div className="nw-inner">
        <p className="nw-note">
          Die Kurzfassungen erstellt eine KI aus den Meldungen der verlinkten Quellen (Heise, Wired, Netzwoche u. a.).
          Den vollständigen Bericht liest du bei der Quelle. <Link href="/ki-transparenz">KI-Transparenz</Link>
        </p>
        {days.length === 0 && <p className="nw-empty">Gerade sind keine Meldungen verfügbar.</p>}
        {days.map(([day, list]) => {
          const label = newsDayLabel(day, now);
          const isNamed = label === "Heute" || label === "Gestern";
          return (
            <section key={day} className="nw-day" aria-labelledby={`d-${day}`}>
              <h2 className="nw-day-h" id={`d-${day}`}>
                {isNamed ? label : newsDayDate(day)}
                {isNamed && <small>{newsDayDate(day)}</small>}
              </h2>
              {list.map((it) => (
                <article key={it.id} id={`n-${it.id}`} className="nw-item">
                  <div className="nw-time">{newsClock(it.publishedAt)}</div>
                  <div>
                    <h3 className="nw-title">{it.title}</h3>
                    <p className="nw-summary">{it.summary}</p>
                    <p className="nw-meta">
                      <a className="nw-src" href={it.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {it.sourceName} ↗
                      </a>
                      {it.category && NEWS_CATEGORY_LABEL[it.category] && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{NEWS_CATEGORY_LABEL[it.category]}</span>
                        </>
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div></div>
      <Footer />
    </main>
  );
}

