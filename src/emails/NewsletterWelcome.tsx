import Layout, {
  CtaButton,
  Heading,
  Paragraph,
  SITE_URL,
} from "./_layout";
import { Link, Section } from "@react-email/components";

type Props = {
  unsubscribeUrl: string;
};

export const SUBJECT = "Willkommen bei digital-age";

export default function NewsletterWelcome({ unsubscribeUrl }: Props) {
  return (
    <Layout previewText="Du bist drin — willkommen bei digital-age">
      <Heading>Du bist drin!</Heading>
      <Paragraph>
        Danke für deine Anmeldung. Wir freuen uns, dich an Bord zu haben.
      </Paragraph>
      <Paragraph>
        Der erste Newsletter kommt bald — bis dahin: viel Spass beim Stöbern in
        unseren Artikeln zu KI &amp; Future Tech.
      </Paragraph>
      <CtaButton href={SITE_URL}>Artikel entdecken →</CtaButton>

      <Section style={{ marginTop: 12 }}>
        <p
          className="footer-text"
          style={{
            color: "#71717a",
            fontSize: 12,
            lineHeight: 1.6,
            margin: 0,
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          Keine Lust mehr?{" "}
          <Link
            href={unsubscribeUrl}
            className="footer-text"
            style={{ color: "#71717a", textDecoration: "underline" }}
          >
            Hier kannst du dich jederzeit abmelden
          </Link>
          .
        </p>
      </Section>
    </Layout>
  );
}
