import Layout, { Heading, HintBox, Paragraph } from "./_layout";

type Props = {
  name: string;
  startupName: string;
  reason?: string | null;
};

export const SUBJECT = "Update zu deinem Startup-Vorschlag";

export default function StartupRejected({
  name,
  startupName,
  reason,
}: Props) {
  const reasonText = reason?.trim();
  return (
    <Layout previewText="Update zu deinem Startup-Vorschlag bei digital-age.">
      <Heading>Update zu deinem Vorschlag.</Heading>
      <Paragraph>Hallo {name},</Paragraph>
      <Paragraph>
        danke für deinen Vorschlag <strong>„{startupName}"</strong>. Leider
        passt der Eintrag aktuell nicht in unsere Swiss-AI-Landscape — wir
        freuen uns über weitere Einreichungen von dir.
      </Paragraph>
      {reasonText && reasonText.length > 0 && (
        <HintBox>
          <strong
            className="hint-strong"
            style={{ color: "#92400e", fontWeight: 700 }}
          >
            Anmerkung der Redaktion:
          </strong>{" "}
          <span className="hint-text" style={{ color: "#78350f" }}>
            {reasonText}
          </span>
        </HintBox>
      )}
      <Paragraph muted small>
        Bei Rückfragen kannst du auf diese Mail antworten.
      </Paragraph>
    </Layout>
  );
}
