import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={{ maxWidth: "600px", margin: "0 auto", padding: "80px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>⏳</div>
          <h1 style={{ color: "var(--da-text)", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", marginBottom: "16px" }}>Profil wird geprüft</h1>
          <p style={{ color: "var(--da-muted)", fontSize: "17px", lineHeight: 1.6 }}>Vielen Dank für deine Registrierung! Wir prüfen dein Profil und melden uns innerhalb von 3 Werktagen per E-Mail.</p>
        </div>

        <div style={{ backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px", padding: "32px", marginBottom: "24px" }}>
          <h3 style={{ color: "var(--da-text)", fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>Was passiert jetzt?</h3>
          <ol style={{ color: "var(--da-text-strong)", fontSize: "14px", lineHeight: 1.8, paddingLeft: "20px" }}>
            <li style={{ marginBottom: "8px" }}>Unsere Redaktion prüft dein Profil</li>
            <li style={{ marginBottom: "8px" }}>Wir schauen uns deine Referenzen an</li>
            <li style={{ marginBottom: "8px" }}>Bei Freigabe erhältst du Zugang zum Autoren-Dashboard</li>
            <li>Du kannst dann deinen ersten Artikel verfassen</li>
          </ol>
        </div>

        <div style={{ backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px", padding: "24px", marginBottom: "32px" }}>
          <p style={{ color: "var(--da-green)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Aktueller Status</p>
          <p style={{ color: "var(--da-text)", fontSize: "18px", fontWeight: 600, marginBottom: "4px" }}>⏳ In Prüfung</p>
          <p style={{ color: "var(--da-muted)", fontSize: "14px" }}>Eingereicht: 17. April 2026</p>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/autor/profil-erstellen" style={{ backgroundColor: "var(--da-card)", color: "var(--da-text-strong)", border: "1px solid var(--da-border)", padding: "12px 24px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>Profil bearbeiten</Link>
          <Link href="/" style={{ backgroundColor: "transparent", color: "var(--da-green)", border: "1px solid var(--da-green)", padding: "12px 24px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>Zur Startseite</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
