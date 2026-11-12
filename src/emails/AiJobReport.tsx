import Layout, { CtaButton, Heading, HintBox, Paragraph } from "./_layout";

// Bericht der woechentlichen KI-Jobs an die Redaktion (PR 197): was die KI
// ohne Freigabe geaendert bzw. veroeffentlicht hat, mit Link zum Eingreifen.
export type AiJobReportLine = { title: string; detail: string; href?: string };

type Props = {
  heading: string;
  intro: string;
  sections: { title: string; lines: AiJobReportLine[] }[];
  errors: string[];
  adminUrl: string;
  adminLabel: string;
};

const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function AiJobReport(p: Props) {
  const li = { margin: "0 0 12px", color: "#1c1c1e", fontSize: 14, lineHeight: 1.5, fontFamily: FONT_BODY };
  return (
    <Layout previewText={p.intro.slice(0, 120)}>
      <Heading>{p.heading}</Heading>
      <Paragraph>{p.intro}</Paragraph>
      {p.sections.filter((s) => s.lines.length > 0).map((s) => (
        <div key={s.title}>
          <Paragraph><strong>{s.title}</strong></Paragraph>
          <ul style={{ paddingLeft: 18, margin: "0 0 16px" }}>
            {s.lines.map((l, i) => (
              <li key={i} className="text-primary" style={li}>
                {l.href ? <a href={l.href} className="accent-link" style={{ color: "#16a34a", fontWeight: 700 }}>{l.title}</a> : <strong>{l.title}</strong>}
                {l.detail ? ` · ${l.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {p.errors.length > 0 && (
        <HintBox>
          <strong className="hint-strong" style={{ color: "#92400e", fontWeight: 700 }}>Fehler:</strong>{" "}
          <span className="hint-text" style={{ color: "#78350f" }}>{p.errors.join(" · ")}</span>
        </HintBox>
      )}
      <CtaButton href={p.adminUrl}>{p.adminLabel}</CtaButton>
    </Layout>
  );
}
