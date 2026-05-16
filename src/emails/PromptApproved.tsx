import Layout, { CtaButton, Heading, Paragraph } from "./_layout";

type Props = {
  name: string;
  title: string;
  liveUrl: string;
};

export const SUBJECT_PREFIX = "Dein Prompt ist live";

export default function PromptApproved({ name, title, liveUrl }: Props) {
  return (
    <Layout previewText={`Dein Prompt ist live: ${title}`}>
      <Heading>Dein Prompt ist live.</Heading>
      <Paragraph>Hallo {name},</Paragraph>
      <Paragraph>
        gute Nachricht: dein Vorschlag <strong>„{title}"</strong> wurde in die
        digital-age-Sammlung aufgenommen und ist ab sofort öffentlich
        erreichbar.
      </Paragraph>
      <CtaButton href={liveUrl}>Prompt ansehen →</CtaButton>
      <Paragraph muted small>
        Danke für deinen Beitrag — bei Fragen einfach auf diese Mail antworten.
      </Paragraph>
    </Layout>
  );
}
