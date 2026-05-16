import { Section } from "@react-email/components";
import Layout, { CtaButton, Heading, HintBox, Paragraph } from "./_layout";

type Props = {
  title: string;
  authorName: string;
  authorEmail: string;
  adminUrl: string;
};

export const SUBJECT_PREFIX = "Artikel zur Review";

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

export default function ArticleSubmittedForReview({
  title,
  authorName,
  authorEmail,
  adminUrl,
}: Props) {
  return (
    <Layout previewText={`${authorName} hat einen Artikel zur Review eingereicht.`}>
      <Heading>Neuer Artikel zur Review</Heading>
      <Paragraph muted small>
        Ein Author hat einen Artikel zur redaktionellen Prüfung eingereicht.
        Details unten — Lektorat und Publish-Entscheidung im Admin.
      </Paragraph>

      {metaRow("Titel", title)}
      {metaRow("Author", `${authorName} (${authorEmail})`)}

      <CtaButton href={adminUrl}>Im Admin öffnen →</CtaButton>

      <HintBox>
        <strong
          className="hint-strong"
          style={{ color: "#92400e", fontWeight: 700 }}
        >
          Tipp:
        </strong>{" "}
        <span className="hint-text" style={{ color: "#78350f" }}>
          Reply-To ist auf <strong>{authorEmail}</strong> gesetzt — direkter
          Reply an den Author ist möglich.
        </span>
      </HintBox>
    </Layout>
  );
}
