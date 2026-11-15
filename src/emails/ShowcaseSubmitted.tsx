import Layout, { CtaButton, Heading, Paragraph } from "./_layout";

// Meldung an die Redaktion: Ein Unternehmen hat den Fragebogen abgeschickt.

export type ShowcaseSubmittedProps = {
  company: string;
  contact: string;
  mode: "Fragen beantwortet" | "eigener Text";
  // Kurze Liste, was dabei ist: «Logo», «Bild», «3 Profiländerungen», …
  extras: string[];
  adminUrl: string;
};

export function showcaseSubmittedSubject(company: string): string {
  return `Showcase: Fragebogen von ${company}`;
}

export default function ShowcaseSubmitted({ company, contact, mode, extras, adminUrl }: ShowcaseSubmittedProps) {
  return (
    <Layout previewText={`${company} hat den Showcase-Fragebogen abgeschickt.`}>
      <Heading>Fragebogen von {company}</Heading>
      <Paragraph>
        {contact} hat den Fragebogen abgeschickt ({mode}).{extras.length > 0 ? ` Dabei: ${extras.join(", ")}.` : ""}
      </Paragraph>
      <Paragraph muted small>
        Profiländerungen und Logo übernimmst du in der Verwaltung mit einem Klick. Der Entwurf des Beitrags folgt im nächsten Schritt.
      </Paragraph>
      <CtaButton href={adminUrl}>Einreichung ansehen →</CtaButton>
    </Layout>
  );
}
