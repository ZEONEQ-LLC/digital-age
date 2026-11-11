import Layout, { CtaButton, Heading, HintBox, Paragraph, UrlFallback } from "./_layout";

// Wochenmail des Modell-Checks (Cron Montag frueh). Geht nur raus, wenn es
// gegenueber dem letzten Lauf etwas Neues gibt: Empfehlung, Hinweis oder
// Fehler. Gewechselt wird im Admin, nie automatisch.

export type ModelCheckMailItem = { level: "warn" | "info" | "rec"; message: string };

export type ModelCheckMailProps = {
  items: ModelCheckMailItem[];
  errors: string[];
  totalItems: number;
  adminUrl: string;
};

export function buildModelCheckSubject(p: Pick<ModelCheckMailProps, "items" | "errors">): string {
  if (p.errors.length > 0 && p.items.length === 0) return "Modell-Check: Fehler beim Prüflauf";
  const recs = p.items.filter((i) => i.level === "rec").length;
  return recs > 0
    ? `Modell-Check: ${recs} neue Empfehlung${recs === 1 ? "" : "en"}`
    : "Modell-Check: neue Hinweise";
}

const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function ModelCheckReport(p: ModelCheckMailProps) {
  const recs = p.items.filter((i) => i.level === "rec");
  const hints = p.items.filter((i) => i.level !== "rec");
  const li = { margin: "0 0 10px", color: "#1c1c1e", fontSize: 14, lineHeight: 1.5, fontFamily: FONT_BODY };
  return (
    <Layout previewText={buildModelCheckSubject(p)}>
      <Heading>Modell-Check</Heading>
      <Paragraph muted small>
        Neu seit dem letzten Prüflauf. Kosten sind Prognosen («ca.») aus den gemessenen Tokens. Gewechselt wird nur
        im Admin per Klick.
      </Paragraph>

      {recs.length > 0 && (
        <>
          <Paragraph><strong>Empfehlungen</strong></Paragraph>
          <ul style={{ paddingLeft: 18, margin: "0 0 16px" }}>
            {recs.map((r, i) => (
              <li key={i} className="text-primary" style={li}>{r.message}</li>
            ))}
          </ul>
        </>
      )}

      {hints.length > 0 && (
        <>
          <Paragraph><strong>Hinweise</strong></Paragraph>
          <ul style={{ paddingLeft: 18, margin: "0 0 16px" }}>
            {hints.map((h, i) => (
              <li key={i} className="text-primary" style={li}>{h.message}</li>
            ))}
          </ul>
        </>
      )}

      {p.errors.length > 0 && (
        <HintBox>
          <strong className="hint-strong" style={{ color: "#92400e", fontWeight: 700 }}>Fehler beim Prüflauf:</strong>{" "}
          <span className="hint-text" style={{ color: "#78350f" }}>{p.errors.join(" · ")}</span>
        </HintBox>
      )}

      <CtaButton href={p.adminUrl}>Im Admin ansehen →</CtaButton>
      <Paragraph muted small>
        Insgesamt {p.totalItems} offene Punkte. Falls der Button nicht funktioniert:
      </Paragraph>
      <UrlFallback url={p.adminUrl} />
    </Layout>
  );
}
