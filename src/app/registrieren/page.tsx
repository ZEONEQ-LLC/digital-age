"use client";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";

const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "var(--da-dark)", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: "4px", padding: "14px 16px", fontSize: "15px", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", color: "var(--da-text-strong)", fontSize: "14px", fontWeight: 600, marginBottom: "8px" };

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={{ maxWidth: "500px", margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <p style={{ color: "var(--da-green)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>Schritt 1 von 2</p>
          <h1 style={{ color: "var(--da-text)", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", marginBottom: "12px" }}>Autor werden</h1>
          <p style={{ color: "var(--da-muted)", fontSize: "15px", lineHeight: 1.5 }}>Erstelle deinen Account. Im nächsten Schritt füllst du dein Profil aus.</p>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
          <div style={{ flex: 1, height: "4px", backgroundColor: "var(--da-green)", borderRadius: "2px" }} />
          <div style={{ flex: 1, height: "4px", backgroundColor: "var(--da-border)", borderRadius: "2px" }} />
        </div>

        <form style={{ backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px", padding: "32px" }}>
          <div style={{ marginBottom: "20px" }}><label style={labelStyle}>E-Mail *</label><input type="email" style={inputStyle} placeholder="du@beispiel.ch" /></div>
          <div style={{ marginBottom: "20px" }}><label style={labelStyle}>Passwort *</label><input type="password" style={inputStyle} placeholder="Min. 8 Zeichen" /></div>
          <div style={{ marginBottom: "24px" }}><label style={labelStyle}>Passwort bestätigen *</label><input type="password" style={inputStyle} /></div>

          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "16px" }}>
            <input type="checkbox" style={{ marginTop: "4px" }} />
            <label style={{ color: "var(--da-text-strong)", fontSize: "13px", lineHeight: 1.5 }}>Ich akzeptiere die <a href="/datenschutzerklaerung" style={{ color: "var(--da-green)" }}>Datenschutzerklärung</a> und stimme zu, dass meine Daten zur Prüfung meines Autoren-Profils verarbeitet werden.</label>
          </div>

          <button type="button" onClick={() => window.location.href = "/autor/profil-erstellen"} style={{ backgroundColor: "var(--da-green)", color: "var(--da-dark)", border: "none", padding: "14px", borderRadius: "4px", fontSize: "15px", fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: "20px" }}>Weiter zu Schritt 2 →</button>

          <p style={{ color: "var(--da-muted-soft)", fontSize: "12px", lineHeight: 1.5, textAlign: "center", marginBottom: "20px" }}>Platzhalter – Account-Erstellung folgt mit Supabase</p>

          <div style={{ borderTop: "1px solid var(--da-border)", paddingTop: "20px", textAlign: "center" }}>
            <p style={{ color: "var(--da-muted)", fontSize: "14px" }}>Schon registriert? <a href="/login" style={{ color: "var(--da-green)", fontWeight: 600, textDecoration: "none" }}>Anmelden</a></p>
          </div>
        </form>
      </section>
      <Footer />
    </main>
  );
}
