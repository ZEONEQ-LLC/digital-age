import { Section } from "@react-email/components";
import Layout, { CtaButton, Heading, HintBox, Paragraph } from "./_layout";

type Props = {
  type: "prompt" | "startup";
  title: string;
  submitterName: string;
  submitterEmail: string;
  adminUrl: string;
};

export function buildSubject(type: Props["type"], title: string): string {
  const prefix = type === "prompt" ? "Neuer Prompt-Vorschlag" : "Neuer Startup-Vorschlag";
  return `${prefix}: ${title}`;
}

function metaRow(label: string, value: string) {
  return (
    <Section style={{ marginBottom: 10 }}>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.6,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <strong
          className="text-primary"
          style={{ color: "#1c1c1e", fontWeight: 600 }}
        >
          {label}:
        </strong>{" "}
        <span className="text-primary" style={{ color: "#1c1c1e" }}>
          {value}
        </span>
      </p>
    </Section>
  );
}

export default function SubmissionNotification({
  type,
  title,
  submitterName,
  submitterEmail,
  adminUrl,
}: Props) {
  const label = type === "prompt" ? "Prompt-Vorschlag" : "Startup-Vorschlag";
  const titleField = type === "prompt" ? "Titel" : "Name";

  return (
    <Layout previewText={`Neuer ${label} von ${submitterName}`}>
      <Heading>Neuer {label}</Heading>
      <Paragraph muted small>
        Ein neuer Vorschlag ist eingegangen. Übersicht unten — Detail-Daten
        und Status-Verwaltung im Admin.
      </Paragraph>

      {metaRow(titleField, title)}
      {metaRow("Von", `${submitterName} (${submitterEmail})`)}

      <CtaButton href={adminUrl}>Im Admin prüfen →</CtaButton>

      <HintBox>
        <strong
          className="hint-strong"
          style={{ color: "#92400e", fontWeight: 700 }}
        >
          Tipp:
        </strong>{" "}
        <span className="hint-text" style={{ color: "#78350f" }}>
          Reply-To ist auf <strong>{submitterEmail}</strong> gesetzt — direkter
          Reply an den Submitter ist möglich.
        </span>
      </HintBox>
    </Layout>
  );
}
