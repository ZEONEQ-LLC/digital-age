import Layout, { CtaButton, Heading, HintBox, Paragraph, UrlFallback } from "./_layout";

// Hinweis an die Redaktion (Cron montags): Ein Newsletter-Entwurf liegt
// bereit oder ein bearbeiteter Entwurf wartet noch auf die Freigabe.
type Props = {
  kind: "created" | "waiting";
  subject: string;
  items: number;
  adminUrl: string;
  aiNote: string | null;
};

export function draftReadySubject(p: Pick<Props, "kind" | "items">): string {
  return p.kind === "created"
    ? `Newsletter-Entwurf bereit: ${p.items} Artikel`
    : "Newsletter-Entwurf wartet auf deine Freigabe";
}

export default function NewsletterDraftReady(p: Props) {
  return (
    <Layout previewText={draftReadySubject(p)}>
      <Heading>{p.kind === "created" ? "Der Newsletter-Entwurf ist bereit." : "Ein Entwurf wartet noch."}</Heading>
      <Paragraph>
        {p.kind === "created"
          ? `Aus ${p.items} neuen Artikeln ist ein Entwurf entstanden. Betreff: «${p.subject}».`
          : `Der bearbeitete Entwurf «${p.subject}» ist noch nicht versendet. Er bleibt unverändert, bis du ihn freigibst oder verwirfst.`}
      </Paragraph>
      {p.aiNote && (
        <HintBox>
          <span className="hint-text" style={{ color: "#78350f" }}>{p.aiNote}</span>
        </HintBox>
      )}
      <Paragraph>Prüfen, Test an dich schicken und freigeben: alles im Admin.</Paragraph>
      <CtaButton href={p.adminUrl}>Entwurf öffnen →</CtaButton>
      <UrlFallback url={p.adminUrl} />
    </Layout>
  );
}
