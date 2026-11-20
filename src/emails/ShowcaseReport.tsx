import Layout, { CtaButton, Heading, Paragraph } from "./_layout";

// Showcase S4: Bericht nach 30 Tagen an das Unternehmen, einmal
// (showcase_submissions.report_sent_at). Zahlen aus der Lesestatistik, nur
// fuer die ersten 30 Kalendertage ab dem Erscheinen.

export type ShowcaseReportProps = {
  firstName: string;
  company: string;
  title: string;
  url: string;
  kitUrl: string;
  views: number;
  reads: number;
  websiteClicks: number;
  avgDuration: string;
  sources: { label: string; views: number }[];
};

export function showcaseReportSubject(title: string): string {
  const t = title.length > 60 ? `${title.slice(0, 57).trimEnd()} …` : title;
  return `Die ersten 30 Tage: «${t}»`;
}

const TEXT = "#1c1c1e";
const MUTED = "#52525b";
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function n(v: number): string {
  return v.toLocaleString("de-CH");
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr>
      <td className="text-primary" style={{ color: TEXT, fontFamily: FONT_BODY, fontSize: 15, padding: "8px 0", borderBottom: "1px solid #e4e4e7" }}>{label}</td>
      <td className="text-primary" style={{ color: TEXT, fontFamily: FONT_BODY, fontSize: 15, fontWeight: strong ? 700 : 400, padding: "8px 0", borderBottom: "1px solid #e4e4e7", textAlign: "right", whiteSpace: "nowrap" }}>{value}</td>
    </tr>
  );
}

export default function ShowcaseReport(p: ShowcaseReportProps) {
  return (
    <Layout previewText={`${n(p.views)} Aufrufe und ${n(p.websiteClicks)} Klicks auf eure Website in den ersten 30 Tagen.`}>
      <Heading>Die ersten 30 Tage</Heading>
      <Paragraph>Hallo {p.firstName}</Paragraph>
      <Paragraph>
        Vor 30 Tagen ist der Beitrag von {p.company} im Showcase erschienen: <strong>«{p.title}»</strong>. Wie versprochen hier die Zahlen.
      </Paragraph>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", margin: "8px 0 20px" }}>
        <tbody>
          <Row label="Aufrufe" value={n(p.views)} strong />
          <Row label="Bis zum Ende gelesen" value={n(p.reads)} />
          <Row label="Lesezeit pro Aufruf" value={p.avgDuration} />
          <Row label="Klicks auf eure Website" value={n(p.websiteClicks)} strong />
        </tbody>
      </table>
      {p.sources.length > 0 && (
        <>
          <p className="text-muted" style={{ color: MUTED, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>Woher die Aufrufe kamen</p>
          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", margin: "0 0 20px" }}>
            <tbody>
              {p.sources.map((s) => <Row key={s.label} label={s.label} value={n(s.views)} />)}
            </tbody>
          </table>
        </>
      )}
      <Paragraph muted small>
        Gezählt ohne Cookies und ohne Kennung: Es sind Aufrufe, keine Personen. Aufrufe der Redaktion und von Bots zählen nicht. Klicks auf eure Website zählen wir höchstens einmal pro Aufruf.
      </Paragraph>
      <Paragraph>
        Der Beitrag bleibt online und mit eurem Profil verknüpft. Die laufenden Zahlen, das Bild und die Texte zum Teilen findet ihr weiterhin im Teilen-Paket.
      </Paragraph>
      <CtaButton href={p.kitUrl}>Teilen-Paket öffnen →</CtaButton>
      <Paragraph muted small>
        Fragen zu den Zahlen oder Lust auf einen weiteren Beitrag? Antworte einfach auf diese Mail, sie landet bei der Redaktion. <a href={p.url} className="accent-link" style={{ color: "#16a34a" }}>Zum Beitrag</a>
      </Paragraph>
    </Layout>
  );
}
