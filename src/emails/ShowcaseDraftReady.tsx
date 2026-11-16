import Layout, { CtaButton, Heading, Paragraph, UrlFallback } from "./_layout";

// Showcase S3b: «Entwurf bereit» an das Unternehmen. Der Link fuehrt zur
// Vorschau des Beitrags (/vorschau/artikel/<token>); dort gibt das Unternehmen
// frei oder wuenscht Aenderungen. Du-Form wie im Fragebogen.

export type ShowcaseDraftReadyProps = {
  firstName: string;
  company: string;
  title: string;
  link: string;
  // «16. Dezember 2026», letzter Tag, an dem der Link funktioniert.
  validUntil: string;
  // Zweiter Versand nach einer Ueberarbeitung.
  again?: boolean;
  // true = Entwurf aus den Antworten des Fragebogens (mit KI), false = das
  // Unternehmen hat einen eigenen Text geliefert.
  aiDrafted: boolean;
};

export function showcaseDraftReadySubject(again: boolean, test: boolean): string {
  const subject = again ? "Euer Beitrag im Showcase: überarbeiteter Entwurf" : "Euer Beitrag im Showcase: Entwurf zur Freigabe";
  return test ? `[Test] ${subject}` : subject;
}

export default function ShowcaseDraftReady({ firstName, company, title, link, validUntil, again = false, aiDrafted }: ShowcaseDraftReadyProps) {
  return (
    <Layout previewText={`Der Entwurf für ${company} ist bereit. So wird der Beitrag erscheinen.`}>
      <Heading>{again ? "Der überarbeitete Entwurf ist bereit" : "Euer Entwurf ist bereit"}</Heading>
      <Paragraph>Hallo {firstName}</Paragraph>
      <Paragraph>
        {again
          ? `Wir haben den Beitrag von ${company} überarbeitet. Unter dem Link siehst du den neuen Stand, so wie er erscheinen wird:`
          : aiDrafted
            ? `Aus euren Antworten ist der Entwurf für den Beitrag von ${company} im Showcase entstanden. Unter dem Link siehst du ihn so, wie er erscheinen wird:`
            : `Der Beitrag von ${company} für den Showcase ist gesetzt. Unter dem Link siehst du ihn so, wie er erscheinen wird:`}
      </Paragraph>
      <Paragraph>
        <strong>«{title}»</strong>
      </Paragraph>
      <CtaButton href={link}>Entwurf ansehen →</CtaButton>
      <UrlFallback url={link} />
      <Paragraph>
        Unten auf der Seite kannst du den Beitrag freigeben oder Änderungen wünschen. Schreib einfach dazu, was nicht stimmt oder was fehlt. Ohne eure Freigabe erscheint nichts.
      </Paragraph>
      <Paragraph>
        {aiDrafted
          ? "Den ersten Entwurf haben wir mit Hilfe von KI aus euren Antworten erstellt. Bitte prüft besonders Zahlen, Namen und Zitate: Ihr kennt die Fakten."
          : "Euer Text ist die Grundlage. Titel und Abstract haben wir ergänzt, bitte schaut auch diese an."}
      </Paragraph>
      <Paragraph muted small>
        Der Link ist bis {validUntil} gültig und nicht öffentlich. Du kannst ihn intern weitergeben. Fragen? Antworte einfach auf diese Mail, sie landet bei der Redaktion.
      </Paragraph>
    </Layout>
  );
}
