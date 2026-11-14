import Link from "next/link";
import ArticleBody from "@/components/ArticleBody";
import Footer from "@/components/Footer";
import { buildListingMetadata } from "@/lib/listingMetadata";
import { SWISS_STATUSES } from "@/lib/mappers/startupMappers";
import { AFFILIATION_LABEL, INVESTOR_LABEL } from "@/lib/startupTrust";

// Regeln des Swiss-AI-Verzeichnisses (S1, 14.11.2026). Bewusst eine Code-Seite
// und keine CMS-Seite: Die Kennzeichnungen im Verzeichnis (Spotlight, «Offen
// für Investoren», «Daten bestätigt am», «Mit dem Herausgeber verbunden»)
// verlinken auf feste Sprungmarken; CMS-Überschriften haben zufällige IDs.
// Status-Definitionen kommen aus SWISS_STATUSES (dieselben wie im
// Einreichformular). Der Abschnitt zum Showcase folgt mit der Rubrik.

export const metadata = buildListingMetadata({
  path: "/swiss-ai/regeln",
  title: "Swiss AI: Aufnahme, Status, Spotlight und Interessenbindungen",
  description:
    "So führen wir das Verzeichnis der Schweizer KI-Unternehmen: wer aufgenommen wird, was die Kennzeichnungen bedeuten, wie der Spotlight vergeben wird und wo der Herausgeber eigene Interessen hat.",
});

const SECTIONS = [
  { id: "aufnahme", title: "Aufnahme ins Verzeichnis" },
  { id: "status", title: "Status" },
  { id: "investoren", title: INVESTOR_LABEL },
  { id: "spotlight", title: "Spotlight" },
  { id: "daten", title: "Daten bestätigt am" },
  { id: "anzeigen", title: "Anzeigen" },
  { id: "interessen", title: "Interessenbindungen" },
] as const;

export default function SwissAiRulesPage() {
  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <style>{`
        .sr-shell { max-width: 860px; margin: 0 auto; padding: 52px var(--gutter) var(--sp-12); }
        .sr-crumb { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: var(--fs-body-sm); margin-bottom: var(--sp-6); }
        .sr-crumb a { color: var(--da-muted); }
        .sr-crumb a:hover { color: var(--da-green); }
        .sr-crumb span { color: var(--da-faint); }
        .sr-crumb b { color: var(--da-green); font-weight: 600; }
        .sr-h1 {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: clamp(30px, 4vw, 48px); font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 var(--sp-6);
        }
        .sr-lead { color: #c0c0c0; font-size: 20px; line-height: 1.65; font-weight: 300; margin: 0 0 var(--sp-8); }
        .sr-toc { display: flex; flex-wrap: wrap; gap: 6px 20px; padding: 14px 0; margin: 0 0 var(--sp-4); border-top: 1px solid var(--da-border); border-bottom: 1px solid var(--da-border); list-style: none; }
        .sr-toc a { color: var(--da-muted); font-size: 14px; text-decoration: none; }
        .sr-toc a:hover { color: var(--da-green); }
        .sr-body h2 { scroll-margin-top: calc(var(--nav-h) + var(--ticker-h) + 24px); }
        .sr-body h2:target { color: var(--da-green); }
        .sr-body dl { margin: 0 0 26px; }
        .sr-body dt { color: var(--da-text); font-weight: 600; }
        .sr-body dd { margin: 0 0 12px; }
        .sr-stand { color: var(--da-muted-soft); font-size: 13px; margin-top: var(--sp-10); }
      `}</style>
      <div className="sr-shell">
        <nav className="sr-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span>/</span>
          <Link href="/swiss-ai">Swiss AI</Link><span>/</span>
          <b>Regeln</b>
        </nav>
        <h1 className="sr-h1">So führen wir das Swiss-AI-Verzeichnis</h1>
        <p className="sr-lead">
          Wer aufgenommen wird, was die Kennzeichnungen bedeuten und wo der Herausgeber eigene Interessen hat.
        </p>
        <ul className="sr-toc" aria-label="Inhalt">
          {SECTIONS.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}
        </ul>

        <div className="sr-body">
          <ArticleBody>
            <h2 id="aufnahme">Aufnahme ins Verzeichnis</h2>
            <p>
              Wir nehmen Unternehmen auf, bei denen künstliche Intelligenz den Kern des Angebots bildet und die in der
              Schweiz gegründet wurden, ihren Sitz hier haben oder hier wesentlich tätig sind. Wir prüfen die Angaben
              anhand öffentlich zugänglicher Quellen wie der Website des Unternehmens.
            </p>
            <p>
              Die Aufnahme ist kostenlos. Geld hat keinen Einfluss auf Aufnahme, Reihenfolge oder Auswahl. Wir können
              Einträge ohne Begründung ablehnen oder archivieren, etwa wenn ein Unternehmen nicht mehr aktiv ist.{" "}
              <Link href="/swiss-ai/einreichen">Unternehmen eintragen</Link>
            </p>

            <h2 id="status">Status</h2>
            <dl>
              {SWISS_STATUSES.map((s) => (
                <div key={s.code}>
                  <dt>{s.label}</dt>
                  <dd>{s.description}.</dd>
                </div>
              ))}
            </dl>
            <p>Ein Eintrag trägt den Status, der das Unternehmen am besten beschreibt.</p>

            <h2 id="investoren">{INVESTOR_LABEL}</h2>
            <p>
              Die Kennzeichnung zeigt, dass ein Unternehmen nach eigenen Angaben Gespräche mit Investoren führt oder
              eine Finanzierungsrunde plant. Die Angabe stammt vom Unternehmen selbst oder aus öffentlichen Quellen. Wir
              prüfen sie nicht inhaltlich. Angaben zu Finanzierungsstufe, Volumen und letzter Runde können veraltet
              sein.
            </p>
            <p>Die Kennzeichnung ist keine Anlageempfehlung und keine Aufforderung zum Investieren.</p>

            <h2 id="spotlight">Spotlight</h2>
            <p>
              Den Spotlight vergibt die Redaktion, zum Beispiel wegen einer Finanzierungsrunde, eines Produktstarts oder
              eines Beitrags im Magazin. Höchstens drei Unternehmen stehen gleichzeitig im Spotlight. Der Spotlight ist
              nicht käuflich.
            </p>

            <h2 id="daten">Daten bestätigt am</h2>
            <p>
              Das Datum zeigt, wann das Unternehmen oder die Redaktion die Angaben eines Eintrags zuletzt bestätigt hat.
              Fehlt es, stammen die Angaben aus der Einreichung oder aus öffentlichen Quellen und wurden seither nicht
              bestätigt. Stimmt etwas nicht? <Link href="/kontakt">Schreib uns.</Link>
            </p>

            <h2 id="anzeigen">Anzeigen</h2>
            <p>
              Bezahlte Sichtbarkeit ist immer als «Anzeige» gekennzeichnet und vom übrigen Inhalt getrennt. Anzeigen
              haben keinen Einfluss auf Aufnahme, Reihenfolge oder Spotlight.
            </p>

            <h2 id="interessen">Interessenbindungen</h2>
            <p>
              Herausgeberin von digital age ist die ZEONEQ GmbH. Ihr CEO Ali Soy ist zugleich CGO der Connect AI Group
              GmbH. Einträge von Unternehmen, mit denen der Herausgeber verbunden ist, tragen den Hinweis
              «{AFFILIATION_LABEL}». Alle Funktionen des Herausgebers stehen auf der Seite{" "}
              <Link href="/redaktion">Redaktion</Link>.
            </p>
          </ArticleBody>
          <p className="sr-stand">Stand: 14. November 2026</p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
