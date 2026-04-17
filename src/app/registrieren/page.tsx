"use client";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";

const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "#1c1c1e", color: "#ffffff", border: "1px solid #3a3a3e", borderRadius: "4px", padding: "14px 16px", fontSize: "15px", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", color: "#e0e0e0", fontSize: "14px", fontWeight: 600, marginBottom: "8px" };

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={{ maxWidth: "500px", margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <p style={{ color: "#32ff7e", fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>Schritt 1 von 2</p>
          <h1 style={{ color: "#ffffff", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", marginBottom: "12px" }}>Autor werden</h1>
          <p style={{ color: "#b0b0b0", fontSize: "15px", lineHeight: 1.5 }}>Erstelle deinen Account. Im nächsten Schritt füllst du dein Profil aus.</p>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
          <div style={{ flex: 1, height: "4px", backgroundColor: "#32ff7e", borderRadius: "2px" }} />
          <div style={{ flex: 1, height: "4px", backgroundColor: "#3a3a3e", borderRadius: "2px" }} />
        </div>

        <form style={{ backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: "8px", padding: "32px" }}>
          <div style={{ marginBottom: "20px" }}><label style={labelStyle}>E-Mail *</label><input type="email" style={inputStyle} placeholder="du@beispiel.ch" /></div>
          <div style={{ marginBottom: "20px" }}><label style={labelStyle}>Passwort *</label><input type="password" style={inputStyle} placeholder="Min. 8 Zeichen" /></div>
          <div style={{ marginBottom: "24px" }}><label style={labelStyle}>Passwort bestätigen *</label><input type="password" style={inputStyle} /></div>

          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "16px" }}>
            <input type="checkbox" style={{ marginTop: "4px" }} />
            <label style={{ color: "#e0e0e0", fontSize: "13px", lineHeight: 1.5 }}>Ich akzeptiere die <a href="/datenschutzerklaerung" style={{ color: "#32ff7e" }}>Datenschutzerklärung</a> und stimme zu, dass meine Daten zur Prüfung meines Autoren-Profils verarbeitet werden.</label>
          </div>

          <button type="button" onClick={() => window.location.href = "/autor/profil-erstellen"} style={{ backgroundColor: "#32ff7e", color: "#1c1c1e", border: "none", padding: "14px", borderRadius: "4px", fontSize: "15px", fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: "20px" }}>Weiter zu Schritt 2 →</button>

          <p style={{ color: "#666", fontSize: "12px", lineHeight: 1.5, textAlign: "center", marginBottom: "20px" }}>Platzhalter – Account-Erstellung folgt mit Supabase</p>

          <div style={{ borderTop: "1px solid #3a3a3e", paddingTop: "20px", textAlign: "center" }}>
            <p style={{ color: "#b0b0b0", fontSize: "14px" }}>Schon registriert? <a href="/login" style={{ color: "#32ff7e", fontWeight: 600, textDecoration: "none" }}>Anmelden</a></p>
          </div>
        </form>
      </section>
      <Footer />
    </main>
  );
}
