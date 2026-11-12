import Layout, { CtaButton, Heading, Paragraph, UrlFallback } from "./_layout";

// Abschlussbericht an den Werbekunden (Entscheid Ali 12.11.2026): am Morgen
// nach dem Kampagnenende, Sie-Form, finale Zahlen und Vorschau-Link, der noch
// 30 Tage gueltig bleibt. Zahlen kommen formatiert (statsFormat.ts).
export type EndReportRow = { label: string; impressions: string; clicks: string; ctr: string };

type Props = {
  campaignName: string;
  periodText: string;                 // z. B. «01.11.2026 – 30.11.2026»
  total: EndReportRow;                // label = «Gesamt»
  byPlacement: EndReportRow[];
  previewUrl: string;
  validUntil: string;                 // dd.MM.yyyy, letzter gueltiger Tag
  countRule: string;
};

export function endReportSubject(campaignName: string): string {
  return `Ihre Kampagne «${campaignName}» ist beendet: die Zahlen`;
}

const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_MONO = "'Roboto Mono', Menlo, Consolas, monospace";

function Cell({ children, head = false, right = false, strong = false }: { children: string; head?: boolean; right?: boolean; strong?: boolean }) {
  return (
    <td
      className={head ? "text-muted" : "text-primary"}
      style={{
        padding: "8px 6px",
        borderBottom: "1px solid #e4e4e7",
        textAlign: right ? "right" : "left",
        color: head ? "#52525b" : "#1c1c1e",
        fontFamily: right ? FONT_MONO : FONT_BODY,
        fontSize: head ? 12 : 14,
        fontWeight: strong || head ? 700 : 400,
        whiteSpace: right ? "nowrap" : "normal",
      }}
    >
      {children}
    </td>
  );
}

export default function CampaignEndReport(p: Props) {
  const rows = p.byPlacement.length > 1 ? [...p.byPlacement, p.total] : [p.total];
  return (
    <Layout previewText={`${p.total.impressions} Einblendungen, ${p.total.clicks} Klicks: der Abschluss Ihrer Kampagne`}>
      <Heading>Ihre Kampagne ist beendet.</Heading>
      <Paragraph>Guten Tag</Paragraph>
      <Paragraph>
        Ihre Kampagne <strong>«{p.campaignName}»</strong> auf digital-age.ch ist abgeschlossen ({p.periodText}).
        Vielen Dank für Ihr Vertrauen. Hier sind die finalen Zahlen:
      </Paragraph>
      <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", borderCollapse: "collapse", margin: "0 0 12px" }}>
        <tbody>
          <tr>
            <Cell head>Platzierung</Cell>
            <Cell head right>Einblendungen</Cell>
            <Cell head right>Klicks</Cell>
            <Cell head right>CTR</Cell>
          </tr>
          {rows.map((r, i) => {
            const strong = r === p.total;
            return (
              <tr key={i}>
                <Cell strong={strong}>{r.label}</Cell>
                <Cell right strong={strong}>{r.impressions}</Cell>
                <Cell right strong={strong}>{r.clicks}</Cell>
                <Cell right strong={strong}>{r.ctr}</Cell>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Paragraph muted small>{p.countRule}</Paragraph>
      <Paragraph>
        Den Verlauf pro Tag und Ihre Motive finden Sie in Ihrer Vorschau. Der Link ist bis zum{" "}
        <strong>{p.validUntil}</strong> gültig.
      </Paragraph>
      <CtaButton href={p.previewUrl}>Verlauf und Motive ansehen →</CtaButton>
      <UrlFallback url={p.previewUrl} />
      <Paragraph>
        Möchten Sie eine neue Kampagne planen? Antworten Sie einfach auf diese E-Mail.
      </Paragraph>
      <Paragraph muted small>
        Diese Nachricht wurde automatisch am Tag nach dem Kampagnenende erstellt.
      </Paragraph>
    </Layout>
  );
}
