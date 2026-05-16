import Layout, { CtaButton, Heading, Paragraph } from "./_layout";

type Props = {
  authorName: string;
  title: string;
  liveUrl: string;
};

export const SUBJECT_PREFIX = "Dein Artikel ist veröffentlicht";

export default function ArticlePublished({
  authorName,
  title,
  liveUrl,
}: Props) {
  return (
    <Layout previewText={`Dein Artikel ist live: ${title}`}>
      <Heading>Dein Artikel ist live.</Heading>
      <Paragraph>Hallo {authorName},</Paragraph>
      <Paragraph>
        gute Nachricht: dein Artikel <strong>„{title}"</strong> ist ab sofort
        auf digital-age veröffentlicht und für alle Leser sichtbar.
      </Paragraph>
      <CtaButton href={liveUrl}>Artikel ansehen →</CtaButton>
      <Paragraph muted small>
        Danke für deinen Beitrag — bei Fragen einfach auf diese Mail antworten.
      </Paragraph>
    </Layout>
  );
}
