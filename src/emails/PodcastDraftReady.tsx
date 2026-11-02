import { Column, Img, Link, Row, Section } from "react-email";
import Layout, { CtaButton, Heading, HintBox, Paragraph, UrlFallback } from "./_layout";

// Mail an den Empfehler, sobald die Anreicherung einer per Kurzbefehl
// geteilten Podcast-Empfehlung durch ist (oder gescheitert ist). Zeigt, was
// die KI geschrieben hat, damit die Entscheidung direkt aus der Mail heraus
// faellt; freigegeben wird eingeloggt unter /autor/freigaben.

export type PodcastDraftMailProps = {
  status: "ready" | "failed";
  kind: "Folge" | "Podcast";
  title: string;
  showName?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  category: string;
  languageLabel: string;
  durationLabel?: string | null;
  reviewUrl: string;
  appleUrl?: string | null;
  error?: string | null;
};

export function buildSubject(p: Pick<PodcastDraftMailProps, "status" | "kind" | "title">): string {
  return p.status === "ready"
    ? `Zur Freigabe: ${p.title}`
    : `Empfehlung braucht Hilfe: ${p.title}`;
}

const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_DISPLAY = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function PodcastDraftReady(p: PodcastDraftMailProps) {
  const ready = p.status === "ready";
  const meta = [p.kind, p.category, p.languageLabel, p.durationLabel ?? null]
    .filter((m): m is string => !!m)
    .join(" · ");

  return (
    <Layout previewText={ready ? `Zur Freigabe: ${p.title}` : `Anreicherung fehlgeschlagen: ${p.title}`}>
      <Heading>{ready ? "Neue Podcast-Empfehlung" : "Empfehlung braucht Hilfe"}</Heading>
      <Paragraph muted small>
        {ready
          ? "Per Kurzbefehl geteilt, von der KI ergänzt. Kurz lesen, dann veröffentlichen oder verwerfen."
          : "Per Kurzbefehl geteilt, aber die automatische Ergänzung ist gescheitert. Der Entwurf wartet trotzdem auf der Freigaben-Seite."}
      </Paragraph>

      <Section
        className="card-box"
        style={{
          backgroundColor: "#f4f4f5",
          borderRadius: 8,
          padding: "16px",
          margin: "8px 0 20px",
        }}
      >
        <Row>
          {p.coverUrl && (
            <Column style={{ width: 96, verticalAlign: "top", paddingRight: 16 }}>
              <Img
                src={p.coverUrl}
                alt=""
                width={96}
                height={96}
                style={{ display: "block", width: 96, height: 96, borderRadius: 8, objectFit: "cover" }}
              />
            </Column>
          )}
          <Column style={{ verticalAlign: "top" }}>
            <p
              className="text-primary"
              style={{ margin: "0 0 6px", color: "#1c1c1e", fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}
            >
              {p.title}
            </p>
            {p.showName && (
              <p className="text-muted" style={{ margin: "0 0 6px", color: "#52525b", fontSize: 13, lineHeight: 1.5, fontFamily: FONT_BODY }}>
                {p.showName}
              </p>
            )}
            <p className="text-muted" style={{ margin: 0, color: "#52525b", fontSize: 12, lineHeight: 1.5, fontFamily: FONT_BODY }}>
              {meta}
            </p>
          </Column>
        </Row>
      </Section>

      {ready && p.description && <Paragraph>{p.description}</Paragraph>}

      {!ready && (
        <HintBox>
          <strong className="hint-strong" style={{ color: "#92400e", fontWeight: 700 }}>Grund:</strong>{" "}
          <span className="hint-text" style={{ color: "#78350f" }}>
            {p.error ?? "Unbekannt"}
            <br />
            Auf der Freigaben-Seite «Erneut versuchen» tippen oder am Desktop ergänzen.
          </span>
        </HintBox>
      )}

      <CtaButton href={p.reviewUrl}>{ready ? "Prüfen und freigeben →" : "Zur Freigaben-Seite →"}</CtaButton>

      {p.appleUrl && (
        <Paragraph muted small>
          <Link href={p.appleUrl} className="text-muted" style={{ color: "#52525b", textDecoration: "underline" }}>
            In Apple Podcasts öffnen
          </Link>
        </Paragraph>
      )}
      <Paragraph muted small>Falls der Button nicht funktioniert:</Paragraph>
      <UrlFallback url={p.reviewUrl} />
    </Layout>
  );
}
