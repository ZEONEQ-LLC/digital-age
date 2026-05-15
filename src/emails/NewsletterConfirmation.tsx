import Layout, {
  CtaButton,
  Heading,
  HintBox,
  Paragraph,
  UrlFallback,
} from "./_layout";

type Props = {
  confirmationUrl: string;
};

export const SUBJECT = "Bestätige deine Anmeldung bei digital-age";

export default function NewsletterConfirmation({ confirmationUrl }: Props) {
  return (
    <Layout previewText="Bestätige deine Anmeldung bei digital-age">
      <Heading>Willkommen bei digital-age</Heading>
      <Paragraph>
        Schön, dass du dabei bist. Klick auf den Button unten, um deine
        Newsletter-Anmeldung zu bestätigen.
      </Paragraph>
      <CtaButton href={confirmationUrl}>Anmeldung bestätigen →</CtaButton>
      <Paragraph muted small>
        Falls der Button nicht funktioniert, kopier diesen Link in deinen
        Browser:
      </Paragraph>
      <UrlFallback url={confirmationUrl} />
      <HintBox>
        <strong
          className="hint-strong"
          style={{ color: "#92400e", fontWeight: 700 }}
        >
          Hinweis:
        </strong>{" "}
        <span className="hint-text" style={{ color: "#78350f" }}>
          Der Link ist 7 Tage gültig und kann nur einmal verwendet werden. Wenn
          du diesen Newsletter nicht angefordert hast, ignoriere diese Mail
          einfach — wir speichern dann keine weiteren Daten.
        </span>
      </HintBox>
    </Layout>
  );
}
