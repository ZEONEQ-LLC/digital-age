import Layout, {
  CtaButton,
  Heading,
  HintBox,
  Paragraph,
  UrlFallback,
} from "./_layout";

type Props = {
  inviteUrl: string;
  displayName?: string | null;
  intendedRole?: "author" | "editor";
};

export const SUBJECT = "Einladung: Werde Autor bei digital-age";

export default function AuthorInvite({
  inviteUrl,
  displayName,
  intendedRole,
}: Props) {
  const greeting = displayName ? `Hallo ${displayName},` : "Hallo,";
  const roleLabel = intendedRole === "editor" ? "Editor:in" : "Autor:in";

  return (
    <Layout previewText="Einladung: Werde Autor bei digital-age">
      <Heading>Du bist eingeladen.</Heading>
      <Paragraph>{greeting}</Paragraph>
      <Paragraph>
        wir würden uns freuen, dich als <strong>{roleLabel}</strong> bei
        digital-age an Bord zu haben. digital-age ist ein unabhängiges
        News-Magazin für Künstliche Intelligenz und Future Tech mit Fokus auf
        die DACH-Region.
      </Paragraph>
      <Paragraph>
        Klick auf den Button unten, um dein Onboarding zu starten. Du wirst zu
        einem kurzen Magic-Link-Login geführt — danach kannst du dein Profil
        anlegen und sofort mit dem Schreiben beginnen.
      </Paragraph>
      <CtaButton href={inviteUrl}>Onboarding starten →</CtaButton>
      <Paragraph muted small>
        Falls der Button nicht funktioniert, kopier diesen Link in deinen
        Browser:
      </Paragraph>
      <UrlFallback url={inviteUrl} />
      <HintBox>
        <strong
          className="hint-strong"
          style={{ color: "#92400e", fontWeight: 700 }}
        >
          Hinweis:
        </strong>{" "}
        <span className="hint-text" style={{ color: "#78350f" }}>
          Der Einladungs-Link ist 14 Tage gültig. Wenn du dich nicht eingeladen
          fühlst, kannst du diese Mail einfach löschen.
        </span>
      </HintBox>
    </Layout>
  );
}
