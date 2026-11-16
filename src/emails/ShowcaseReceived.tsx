import Layout, { Heading, Paragraph } from "./_layout";

// Bestaetigung an das Unternehmen nach dem Absenden des Fragebogens.

export type ShowcaseReceivedProps = {
  firstName: string;
  company: string;
  // Hat das Unternehmen der Kontaktweiterleitung zugestimmt?
  forwardingEmail: string | null;
};

export const SHOWCASE_RECEIVED_SUBJECT = "Danke, euer Fragebogen ist angekommen";

export default function ShowcaseReceived({ firstName, company, forwardingEmail }: ShowcaseReceivedProps) {
  return (
    <Layout previewText={`Wir haben die Angaben von ${company} erhalten und melden uns mit dem Entwurf.`}>
      <Heading>Danke, euer Fragebogen ist angekommen</Heading>
      <Paragraph>Hallo {firstName}</Paragraph>
      <Paragraph>
        Wir haben die Angaben von {company} erhalten. Als Nächstes machen wir daraus einen Entwurf und schicken ihn dir zur Freigabe. Ohne eure Freigabe erscheint nichts.
      </Paragraph>
      <Paragraph>
        Der Beitrag wird als Unternehmensbeitrag gekennzeichnet. Eure Profildaten im Verzeichnis gleichen wir mit euren Angaben ab.
      </Paragraph>
      {forwardingEmail && (
        <Paragraph>
          Kontaktanfragen über euer Profil leiten wir an {forwardingEmail} weiter. Jede weitergeleitete Mail enthält einen Link, mit dem ihr das wieder beenden könnt.
        </Paragraph>
      )}
      <Paragraph muted small>
        Fragen oder etwas vergessen? Antworte einfach auf diese Mail, sie landet bei der Redaktion.
      </Paragraph>
    </Layout>
  );
}
