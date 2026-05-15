import { Link, Section } from "@react-email/components";
import Layout, { CtaButton, Heading, HintBox, Paragraph } from "./_layout";

type Props = {
  id: string;
  title: string;
  excerpt: string;
  bodyMd: string;
  category?: string | null;
  authorName: string;
  authorEmail: string;
  authorRole?: string | null;
  authorBio: string;
  authorWebsite?: string | null;
  siteUrl: string;
};

export const SUBJECT_PREFIX = "Neuer Artikel-Pitch";

function metaRow(label: string, value: React.ReactNode) {
  return (
    <Section style={{ marginBottom: 8 }}>
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

function block(label: string, content: string) {
  return (
    <>
      <Section style={{ marginTop: 18, marginBottom: 6 }}>
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
          {label}:
        </p>
      </Section>
      <Section
        style={{
          backgroundColor: "#f4f4f5",
          borderRadius: 6,
          padding: "12px 14px",
          marginBottom: 6,
        }}
      >
        <p
          className="text-primary"
          style={{
            color: "#1c1c1e",
            fontSize: 13,
            lineHeight: 1.6,
            margin: 0,
            whiteSpace: "pre-wrap",
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {content}
        </p>
      </Section>
    </>
  );
}

export default function PitchNotification({
  id,
  title,
  excerpt,
  bodyMd,
  category,
  authorName,
  authorEmail,
  authorRole,
  authorBio,
  authorWebsite,
  siteUrl,
}: Props) {
  // Body wird auf die ersten ~1500 Zeichen gekürzt — voller Text ist im
  // Admin sichtbar. Mail soll lesbar bleiben.
  const bodyPreview =
    bodyMd.length > 1500 ? `${bodyMd.slice(0, 1500)}\n\n[…gekürzt — im Admin lesen]` : bodyMd;

  return (
    <Layout previewText={`Neuer Pitch von ${authorName}: ${title}`}>
      <Heading>Neuer Artikel-Pitch</Heading>

      <Paragraph muted small>
        Ein neuer Artikel-Pitch ist eingegangen. Übersicht unten — voller
        Markdown-Text und Status-Verwaltung im Admin.
      </Paragraph>

      {metaRow("Titel", title)}
      {category && metaRow("Kategorie", category)}
      {metaRow(
        "Author",
        `${authorName} (${authorEmail})${
          authorRole && authorRole.trim() !== "" ? ` — ${authorRole}` : ""
        }`,
      )}
      {authorWebsite && authorWebsite.trim() !== "" && (
        <Section style={{ marginBottom: 8 }}>
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
              Bio/Website:
            </strong>{" "}
            <Link
              href={authorWebsite}
              className="accent-link"
              style={{ color: "#16a34a", textDecoration: "underline" }}
            >
              {authorWebsite}
            </Link>
          </p>
        </Section>
      )}

      {block("Kurzbio", authorBio)}
      {block("Abstract", excerpt)}
      {block("Volltext", bodyPreview)}

      <CtaButton href={`${siteUrl}/autor/admin/pitches?id=${id}`}>
        Im Admin prüfen →
      </CtaButton>

      <HintBox>
        <strong
          className="hint-strong"
          style={{ color: "#92400e", fontWeight: 700 }}
        >
          Tipp:
        </strong>{" "}
        <span className="hint-text" style={{ color: "#78350f" }}>
          Reply-To ist auf <strong>{authorEmail}</strong> gesetzt — direkter
          Reply an den Pitchenden ist möglich.
        </span>
      </HintBox>
    </Layout>
  );
}
