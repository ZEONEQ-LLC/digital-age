import Layout, { Heading, HintBox, Paragraph } from "./_layout";

type Props = {
  name: string;
  title: string;
  reason?: string | null;
};

export const SUBJECT = "Update zu deinem Prompt-Vorschlag";

export default function PromptRejected({ name, title, reason }: Props) {
  const reasonText = reason?.trim();
  return (
    <Layout previewText="Update zu deinem Prompt-Vorschlag bei digital-age.">
      <Heading>Update zu deinem Vorschlag.</Heading>
      <Paragraph>Hallo {name},</Paragraph>
      <Paragraph>
        danke für deinen Vorschlag <strong>„{title}"</strong>. Leider passt der
        Prompt aktuell nicht in unsere Sammlung — wir freuen uns über weitere
        Einreichungen von dir in der Zukunft.
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
