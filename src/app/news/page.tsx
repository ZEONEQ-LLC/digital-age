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
        .nw-method { max-width: 680px; margin: var(--sp-16) 0 0; padding-top: var(--sp-8); border-top: 1px solid var(--da-border); scroll-margin-top: calc(var(--nav-h) + 72px); }
        .nw-method h2 { color: var(--da-text); font-family: var(--da-font-display); font-size: 22px; font-weight: 700; margin: 0 0 12px; }
        .nw-method p { color: #c4c4c4; font-size: 15px; line-height: 1.62; margin: 0 0 12px; }
        .nw-method dl { margin: 4px 0 16px; display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 8px 16px; font-size: 15px; line-height: 1.55; }
        .nw-method dt { color: var(--da-text); font-weight: 600; }
        .nw-method dd { color: #c4c4c4; margin: 0; }
        .nw-method a { color: var(--da-muted); }
        @media (max-width: 640px) {
          .nw-method dl { grid-template-columns: minmax(0, 1fr); gap: 2px; }
          .nw-method dd { margin-bottom: 10px; }
        }
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
        {/* Erklaerung der Einordnung (Ali 19.11.2026). Gibt die Rubrik aus
            newsTicker/assessment.ts wieder; wer sie aendert, passt diesen Text an. */}
        <section id="einordnung" className="nw-method">
          <h2>So ordnen wir ein</h2>
          <p>
            Zu jeder Meldung schätzt eine KI vier Felder ein, in Stufen statt in Noten: kein Bezug, gering, mittel, hoch.
            Die Stufen geben eine grobe Orientierung, sie sind keine Messung.
          </p>
          <dl>
            <dt>Wirtschaft</dt>
            <dd>Folgen für Unternehmen, Märkte, Arbeitsplätze und Investitionen.</dd>
            <dt>Gesellschaft</dt>
            <dd>Folgen für Menschen, Bildung, Demokratie, Datenschutz und Sicherheit.</dd>
            <dt>Umwelt</dt>
            <dd>Energie, Ressourcen und Klima. Meist kein Bezug oder gering, ausser die Meldung handelt direkt davon.</dd>
            <dt>Dringlichkeit</dt>
            <dd>Hoch, wenn man jetzt handeln muss, etwa wegen einer Frist, einer Sicherheitslücke oder eines Gesetzes, das in Kraft tritt. Gering bei Ankündigungen, Studien und Trends.</dd>
          </dl>
          <p>
            «Wichtig» steht bei Meldungen, die für Entscheiderinnen und Entscheider in der Schweiz, Deutschland und Österreich zählen.
            Höchstens jede fünfte Meldung soll diese Marke bekommen. Gerüchte, Einzelmeinungen und Produktwerbung erhalten tiefe Stufen.
          </p>
          <p>
            Grundlage ist allein die Meldung der Quelle, die KI recherchiert nicht nach. Liegt eine Einschätzung daneben, korrigiert
            die Redaktion sie; die Meldung trägt dann den Vermerk «Von der Redaktion eingeordnet». <Link href="/ki-transparenz">KI-Transparenz</Link>
          </p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
