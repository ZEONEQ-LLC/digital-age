import { Link } from "react-email";
import Layout, { Heading, HintBox, Paragraph } from "./_layout";

// Weitergeleitete Anfrage aus dem Formular «Kontakt aufnehmen» auf einer
// Startup-Seite (/swiss-ai/<slug>). Geht nur an Startups, die der
// Weiterleitung zugestimmt haben. Reply-To ist die Absender-Adresse; digital
// age speichert den Inhalt nicht. Jede Mail enthaelt den Link zum Beenden.

export type StartupContactMailProps = {
  startupName: string;
  senderName: string;
  senderEmail: string;
  organization: string | null;
  purposeLabel: string;
  message: string;
  profileUrl: string;
  optOutUrl: string;
};

export function buildStartupContactSubject(p: Pick<StartupContactMailProps, "purposeLabel" | "senderName">): string {
  return `Anfrage über digital age: ${p.purposeLabel} von ${p.senderName}`;
}

const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function StartupContactRequest(p: StartupContactMailProps) {
  const row = (label: string, value: string) => (
    <p className="text-primary" style={{ margin: "0 0 6px", color: "#1c1c1e", fontSize: 14, lineHeight: 1.5, fontFamily: FONT_BODY }}>
      <span className="text-muted" style={{ color: "#52525b" }}>{label}:</span> {value}
    </p>
  );
  return (
    <Layout previewText={`${p.purposeLabel}: Anfrage von ${p.senderName} für ${p.startupName}`}>
      <Heading>Neue Anfrage für {p.startupName}</Heading>
      <Paragraph muted small>
        Über euer Profil im Swiss-AI-Verzeichnis von digital age hat euch jemand kontaktiert. Antwortet direkt auf
        diese Mail, die Antwort geht an {p.senderEmail}.
      </Paragraph>
      <div style={{ backgroundColor: "#f4f4f5", borderRadius: 8, padding: "16px", margin: "8px 0 20px" }} className="card-box">
        {row("Name", p.senderName)}
        {p.organization && row("Organisation", p.organization)}
        {row("E-Mail", p.senderEmail)}
        {row("Anliegen", p.purposeLabel)}
      </div>
      <Paragraph>
        <span style={{ whiteSpace: "pre-wrap" }}>{p.message}</span>
      </Paragraph>
      <HintBox>
        <span className="hint-text" style={{ color: "#78350f" }}>
          Ihr erhaltet diese Mail, weil {p.startupName} der Weiterleitung von Anfragen über digital-age.ch zugestimmt
          hat. digital age speichert den Inhalt nicht.{" "}
          <Link href={p.optOutUrl} style={{ color: "#78350f", textDecoration: "underline" }}>
            Weiterleitung beenden
          </Link>
        </span>
      </HintBox>
      <Paragraph muted small>
        Euer Profil:{" "}
        <Link href={p.profileUrl} className="text-muted" style={{ color: "#52525b", textDecoration: "underline" }}>
          {p.profileUrl}
        </Link>
      </Paragraph>
    </Layout>
  );
}
