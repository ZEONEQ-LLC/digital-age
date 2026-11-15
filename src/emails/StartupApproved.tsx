import Layout, { CtaButton, Heading, Paragraph } from "./_layout";

type Props = {
  name: string;
  startupName: string;
  liveUrl: string;
};

export const SUBJECT_PREFIX = "Dein Startup ist gelistet";

export default function StartupApproved({
  name,
  startupName,
  liveUrl,
}: Props) {
  return (
    <Layout previewText={`Dein Startup ist gelistet: ${startupName}`}>
      <Heading>Willkommen im Swiss-AI-Verzeichnis.</Heading>
      <Paragraph>Hallo {name},</Paragraph>
      <Paragraph>
        gute Nachricht: <strong>„{startupName}“</strong> ist ab sofort im
        Swiss-AI-Verzeichnis von digital age gelistet und für alle Besucher sichtbar.
      </Paragraph>
      <CtaButton href={liveUrl}>Eintrag ansehen →</CtaButton>
      <Paragraph muted small>
        Falls Daten geändert werden müssen, melde dich kurz — wir aktualisieren
        gerne. Antworten auf diese Mail kommen direkt in der Redaktion an.
      </Paragraph>
    </Layout>
  );
}
