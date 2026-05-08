import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={{ maxWidth: "640px", margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>📬</div>
        <h1 style={{ color: "var(--da-text)", fontSize: "36px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", marginBottom: "16px" }}>Fast geschafft!</h1>
        <p style={{ color: "var(--da-muted)", fontSize: "18px", lineHeight: 1.6, marginBottom: "32px" }}>
          Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte klicke auf den Link darin, um dein Abo zu aktivieren.
        </p>

        <div style={{ backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px", padding: "24px", marginBottom: "32px", textAlign: "left" }}>
          <p style={{ color: "var(--da-green)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>Keine E-Mail erhalten?</p>
          <ul style={{ color: "var(--da-text-strong)", fontSize: "14px", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
            <li>Schau in deinem Spam-Ordner nach</li>
            <li>Die E-Mail kommt von <span style={{ color: "var(--da-green)", fontFamily: "Roboto Mono, monospace" }}>hello@digital-age.ch</span></li>
            <li>Es kann bis zu 2 Minuten dauern</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ backgroundColor: "var(--da-green)", color: "var(--da-dark)", padding: "12px 24px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 700 }}>Zur Startseite</Link>
          <Link href="/ki-im-business" style={{ backgroundColor: "transparent", color: "var(--da-green)", border: "1px solid var(--da-green)", padding: "12px 24px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>Artikel entdecken</Link>
        </div>

        <p style={{ color: "var(--da-muted-soft)", fontSize: "12px", lineHeight: 1.5, marginTop: "48px" }}>
          Platzhalter – Bestätigungs-E-Mails werden mit Resend versendet (folgt bald)
        </p>
      </section>
      <Footer />
    </main>
  );
}
