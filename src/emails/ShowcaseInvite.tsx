import Layout, { CtaButton, Heading, Paragraph, UrlFallback } from "./_layout";

// Einladung zum Showcase (Gruendungsrunde). Wortlaut nach Anhang C der
// Uebergabe vom 13.11.2026 (Entwurf von Ali, Du-Form, Absender Ali). Die
// Erinnerung nutzt dieselbe Vorlage mit einem Satz davor.

export type ShowcaseInviteProps = {
  firstName: string;
  company: string;
  link: string;
  // «19. Dezember 2026»
  replyBy: string;
  reminder?: boolean;
};

export const SHOWCASE_INVITE_SUBJECT = "Euer Beitrag im Showcase von digital age (Gründungsrunde, kostenlos)";
export const SHOWCASE_REMINDER_SUBJECT = "Erinnerung: Euer Beitrag im Showcase von digital age";

export function showcaseInviteSubject(reminder: boolean, test: boolean): string {
  const subject = reminder ? SHOWCASE_REMINDER_SUBJECT : SHOWCASE_INVITE_SUBJECT;
  return test ? `[Test] ${subject}` : subject;
}

function List({ items }: { items: string[] }) {
  return (
    <ul
      className="text-primary"
      style={{
        color: "#1c1c1e",
        fontSize: 15,
        lineHeight: 1.65,
        margin: "0 0 16px",
        paddingLeft: 20,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {items.map((item) => (
        <li key={item} style={{ marginBottom: 4 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function ShowcaseInvite({ firstName, company, link, replyBy, reminder = false }: ShowcaseInviteProps) {
  return (
    <Layout previewText={`${company} im Showcase von digital age: Einladung zur Gründungsrunde, für euch kostenlos.`}>
      <Heading>Euer Beitrag im Showcase von digital age</Heading>
      <Paragraph>Hallo {firstName}</Paragraph>
      {reminder && (
        <Paragraph>
          Kurze Erinnerung an unsere Einladung: Der Fragebogen ist noch offen, Antwort bis {replyBy}. Hier nochmals, worum es geht.
        </Paragraph>
      )}
      <Paragraph>
        {company} ist im Swiss-AI-Verzeichnis von digital age gelistet. Wir starten im Januar den «Showcase»: eine eigene Rubrik, in der Schweizer KI-Unternehmen zeigen, woran sie arbeiten, mit einem konkreten Anwendungsfall statt Werbetext. Bis zum Geneva AI Summit im Juni sammeln wir dort die Schweizer KI-Szene.
      </Paragraph>
      <Paragraph>Für die Gründungsrunde laden wir 10–12 Unternehmen ein. Für euch kostenlos.</Paragraph>

      <Paragraph>
        <strong>Was ihr bekommt:</strong>
      </Paragraph>
      <List
        items={[
          "einen Beitrag auf digital-age.ch, verknüpft mit eurem Verzeichnisprofil",
          "ein Paket zum Teilen (Bild, Texte für LinkedIn, Badge)",
          "nach 30 Tagen die Zahlen: Aufrufe und Klicks auf eure Website",
          "ein aktualisiertes Profil mit Logo und, wenn ihr wollt, einem Kontakt-Knopf für Anfragen",
        ]}
      />

      <Paragraph>
        <strong>Was wir brauchen:</strong>
      </Paragraph>
      <List
        items={[
          "rund 20 Minuten für einen Fragebogen (wir machen daraus einen Entwurf, ihr gebt frei)",
          "euer Logo und die Bestätigung eurer Profildaten",
          "dass ihr den Beitrag in euren Kanälen teilt",
        ]}
      />

      <Paragraph>
        Der Beitrag ist als Unternehmensbeitrag gekennzeichnet. So bleibt klar, was Redaktion ist und was ihr erzählt.
      </Paragraph>

      <CtaButton href={link}>{"Hier geht's zum Fragebogen →"}</CtaButton>
      <Paragraph>Antwort bis {replyBy}.</Paragraph>

      <Paragraph>
        Liebe Grüsse
        <br />
        Ali Soy
        <br />
        Herausgeber digital age
      </Paragraph>
      <UrlFallback url={link} />
    </Layout>
  );
}
