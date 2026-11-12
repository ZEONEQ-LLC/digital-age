import Footer from "@/components/Footer";
import HubHero from "@/components/HubHero";
import { buildListingMetadata } from "@/lib/listingMetadata";
import {
  NEWS_CATEGORY_ACCENT,
  NEWS_CATEGORY_LABEL,
  getLatestNews,
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
        .nw-wrap { max-width: var(--max-content); margin: 0 auto; padding: var(--sp-10) var(--gutter) var(--sp-20); }
        .nw-inner { max-width: 860px; }
        .nw-note { color: var(--da-muted-soft); font-size: 13px; line-height: 1.6; margin: 0 0 var(--sp-8); }
        .nw-day { margin-top: var(--sp-10); }
        .nw-day:first-of-type { margin-top: 0; }
        .nw-day-h {
          color: var(--da-muted); font-family: var(--da-font-mono); font-size: 11px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase; margin: 0 0 var(--sp-2);
          padding-bottom: var(--sp-2); border-bottom: 1px solid var(--da-border);
        }
        .nw-item { display: grid; grid-template-columns: 64px 1fr; gap: var(--sp-5); padding: var(--sp-5) 0; border-bottom: 1px solid var(--da-border); scroll-margin-top: calc(var(--nav-h) + 56px); }
        .nw-item:target { background: rgba(50,255,126,0.05); box-shadow: -12px 0 0 rgba(50,255,126,0.05), 12px 0 0 rgba(50,255,126,0.05); }
        .nw-time { color: var(--da-muted); font-family: var(--da-font-mono); font-size: 13px; padding-top: 3px; }
        .nw-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; font-family: var(--da-font-mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
        .nw-cat { font-weight: 700; }
        .nw-src { color: var(--da-muted-soft); }
        .nw-title { color: var(--da-text); font-family: var(--da-font-display); font-size: 20px; font-weight: 700; line-height: 1.3; margin: 0 0 8px; }
        .nw-summary { color: var(--da-text-strong); font-size: 16px; line-height: 1.6; margin: 0 0 10px; }
        .nw-link { color: var(--da-green); font-size: 14px; font-weight: 600; text-decoration: none; }
        .nw-link:hover { text-decoration: underline; }
        .nw-empty { color: var(--da-muted); font-size: 15px; }
        @media (max-width: 640px) {
          .nw-item { grid-template-columns: 1fr; gap: 4px; }
          .nw-time { padding-top: 0; }
          .nw-title { font-size: 18px; }
          .nw-summary { font-size: 15px; }
        }
      `}</style>
      <HubHero title="News" claim="Meldungen zu KI und Future Tech, kurz zusammengefasst" />
      <div className="nw-wrap"><div className="nw-inner">
        <p className="nw-note">
          Die Kurzfassungen erstellt eine KI aus den Meldungen der verlinkten Quellen (Heise, Wired, Netzwoche u. a.).
          Den vollständigen Bericht liest du bei der Quelle.
        </p>
        {days.length === 0 && <p className="nw-empty">Gerade sind keine Meldungen verfügbar.</p>}
        {days.map(([day, list]) => (
          <section key={day} className="nw-day" aria-labelledby={`d-${day}`}>
            <h2 className="nw-day-h" id={`d-${day}`}>{newsDayLabel(day, now)}</h2>
            {list.map((it) => (
              <article key={it.id} id={`n-${it.id}`} className="nw-item">
                <div className="nw-time">{new Date(it.publishedAt).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" })}</div>
                <div>
                  <div className="nw-meta">
                    {it.category && NEWS_CATEGORY_LABEL[it.category] && (
                      <span className="nw-cat" style={{ color: NEWS_CATEGORY_ACCENT[it.category] }}>{NEWS_CATEGORY_LABEL[it.category]}</span>
                    )}
                    {it.category && NEWS_CATEGORY_LABEL[it.category] && <span className="nw-src" aria-hidden>·</span>}
                    <span className="nw-src">{it.sourceName}</span>
                  </div>
                  <h3 className="nw-title">{it.title}</h3>
                  <p className="nw-summary">{it.summary}</p>
                  <a className="nw-link" href={it.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Bei {it.sourceName} weiterlesen ↗
                  </a>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div></div>
      <Footer />
    </main>
  );
}

