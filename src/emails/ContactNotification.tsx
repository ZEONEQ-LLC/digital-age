import { Section } from "@react-email/components";
import Layout, { CtaButton, Heading, HintBox, Paragraph } from "./_layout";

type Props = {
  id: string;
  name: string;
  email: string;
  topic: string;
  organization?: string | null;
  message: string;
  siteUrl: string;
};

export const SUBJECT_PREFIX = "Neue Kontakt-Nachricht";

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

export default function ContactNotification({
  id,
  name,
  email,
  topic,
  organization,
  message,
  siteUrl,
}: Props) {
  return (
    <Layout previewText={`Neue Kontakt-Nachricht von ${name}`}>
      <Heading>Neue Kontakt-Nachricht</Heading>

      {metaRow("Von", `${name} (${email})`)}
      {organization && organization.trim() !== "" && metaRow("Organisation", organization)}
      {metaRow("Anliegen", topic)}

      <Section style={{ marginTop: 20, marginBottom: 8 }}>
        <p
          className="text-primary"
          style={{
            color: "#1c1c1e",
            fontWeight: 600,
            fontSize: 13,
            margin: 0,
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          Nachricht:
        </p>
      </Section>
      <Section
        style={{
          backgroundColor: "#f4f4f5",
          borderRadius: 6,
          padding: "14px 16px",
          marginBottom: 20,
        }}
      >
        <p
          className="text-primary"
          style={{
            color: "#1c1c1e",
            fontSize: 14,
            lineHeight: 1.65,
            margin: 0,
            whiteSpace: "pre-wrap",
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {message}
        </p>
      </Section>

      <CtaButton href={`${siteUrl}/autor/admin/nachrichten?id=${id}`}>
        Im Admin öffnen →
      </CtaButton>

      <HintBox>
        <strong
          className="hint-strong"
          style={{ color: "#92400e", fontWeight: 700 }}
        >
          Tipp:
        </strong>{" "}
        <span className="hint-text" style={{ color: "#78350f" }}>
          Du kannst direkt auf diese Mail antworten — Reply-To ist auf{" "}
          <strong>{email}</strong> gesetzt.
        </span>
      </HintBox>
    </Layout>
  );
}
