import Layout, { Heading, Paragraph } from "./_layout";

type Props = {
  name: string;
  startupName: string;
};

export const SUBJECT = "Danke für deinen Startup-Vorschlag";

export default function StartupSubmissionConfirmation({
  name,
  startupName,
}: Props) {
  return (
    <Layout previewText="Wir haben deinen Startup-Vorschlag erhalten.">
      <Heading>Danke für deinen Vorschlag.</Heading>
      <Paragraph>Hallo {name},</Paragraph>
      <Paragraph>
        danke, dass du <strong>„{startupName}"</strong> für die digital-age
        Swiss-AI-Landscape eingereicht hast. Wir prüfen alle Einreichungen
        sorgfältig und melden uns mit Feedback.
      </Paragraph>
      <Paragraph>
        Bei Rückfragen kannst du auf diese Mail antworten.
      </Paragraph>
      <Paragraph muted small>
        Liebe Grüsse
        <br />
        digital-age Redaktion
      </Paragraph>
    </Layout>
  );
}
