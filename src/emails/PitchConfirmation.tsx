import Layout, { Heading, Paragraph } from "./_layout";

type Props = {
  authorName: string;
  title: string;
};

export const SUBJECT = "Danke für deinen Artikel-Pitch";

export default function PitchConfirmation({ authorName, title }: Props) {
  return (
    <Layout previewText="Wir haben deinen Artikel-Pitch erhalten.">
      <Heading>Danke für deinen Pitch.</Heading>
      <Paragraph>Hallo {authorName},</Paragraph>
      <Paragraph>
        vielen Dank für deinen Beitrag zu <strong>„{title}"</strong>. Wir prüfen
        jede Einreichung sorgfältig und melden uns innerhalb von 5 Werktagen
        bei dir mit Feedback — Annahme, Anpassungs-Vorschlag oder eine
        klare Ablehnung mit Begründung.
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
