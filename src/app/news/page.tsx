import Link from "next/link";
import Footer from "@/components/Footer";
import HubHero from "@/components/HubHero";
import { buildListingMetadata } from "@/lib/listingMetadata";
import { getLatestNews } from "@/lib/newsApi";
import NewsFeed from "@/components/news/NewsFeed";

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

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <style>{`
        .nw-wrap { max-width: var(--max-content); margin: 0 auto; padding: var(--sp-10) var(--gutter) var(--sp-20); }
        .nw-note { color: var(--da-muted-soft); font-size: 13px; line-height: 1.6; margin: 0 0 var(--sp-6); max-width: 680px; }
        .nw-note a { color: var(--da-muted); }
        .nw-empty { color: var(--da-muted); font-size: 15px; }
      `}</style>
      <HubHero title="News" claim="Meldungen zu KI und Future Tech, kurz zusammengefasst" />
      <div className="nw-wrap">
        {items.length === 0 ? (
          <p className="nw-empty">Gerade sind keine Meldungen verfügbar.</p>
        ) : (
          <NewsFeed
            items={items}
            nowIso={now.toISOString()}
            intro={
              <p className="nw-note">
                Die Kurzfassungen erstellt eine KI aus den Meldungen der verlinkten Quellen (Heise, Wired, Netzwoche u. a.).
                Die Einordnung (Wirtschaft, Gesellschaft, Umwelt, Dringlichkeit) ist eine Einschätzung der KI auf Basis der Meldung,
                die Redaktion korrigiert sie bei Bedarf. Den vollständigen Bericht liest du bei der Quelle. <Link href="/ki-transparenz">KI-Transparenz</Link>
              </p>
            }
          />
        )}
      </div>
      <Footer />
    </main>
  );
}
