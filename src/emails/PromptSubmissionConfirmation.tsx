import Layout, { Heading, Paragraph } from "./_layout";

type Props = {
  name: string;
  title: string;
};

export const SUBJECT = "Danke für deinen Prompt-Vorschlag";

export default function PromptSubmissionConfirmation({ name, title }: Props) {
  return (
    <Layout previewText="Wir haben deinen Prompt-Vorschlag erhalten.">
      <Heading>Danke für deinen Prompt-Vorschlag.</Heading>
      <Paragraph>Hallo {name},</Paragraph>
      <Paragraph>
        danke für deinen Vorschlag <strong>„{title}"</strong>. Wir prüfen alle
        Einreichungen sorgfältig und melden uns, sobald die Redaktion eine
        Entscheidung getroffen hat.
      </Paragraph>
      <Paragraph>
        Bei Rückfragen kannst du jederzeit auf diese Mail antworten.
      </Paragraph>
      <Paragraph muted small>
        Liebe Grüsse
        <br />
        digital-age Redaktion
      </Paragraph>
    </Layout>
  );
}
