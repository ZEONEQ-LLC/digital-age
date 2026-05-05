import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";

const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "var(--da-dark)", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: "4px", padding: "14px 16px", fontSize: "15px", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", color: "var(--da-text-strong)", fontSize: "14px", fontWeight: 600, marginBottom: "8px" };

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={{ maxWidth: "440px", margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ color: "var(--da-text)", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", marginBottom: "8px" }}>Willkommen zurück</h1>
          <p style={{ color: "var(--da-muted)", fontSize: "15px" }}>Melde dich in deinem Autoren-Account an</p>
        </div>
        <form style={{ backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px", padding: "32px" }}>
          <div style={{ marginBottom: "20px" }}><label style={labelStyle}>E-Mail</label><input type="email" style={inputStyle} placeholder="du@beispiel.ch" /></div>
          <div style={{ marginBottom: "8px" }}><label style={labelStyle}>Passwort</label><input type="password" style={inputStyle} placeholder="••••••••" /></div>
          <div style={{ textAlign: "right", marginBottom: "24px" }}>
            <a href="#" style={{ color: "var(--da-green)", fontSize: "13px", textDecoration: "none" }}>Passwort vergessen?</a>
          </div>
          <button type="button" style={{ backgroundColor: "var(--da-green)", color: "var(--da-dark)", border: "none", padding: "14px", borderRadius: "4px", fontSize: "15px", fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: "20px" }}>Anmelden</button>
          <p style={{ color: "var(--da-muted-soft)", fontSize: "12px", lineHeight: 1.5, textAlign: "center", marginBottom: "20px" }}>Platzhalter – Login-Funktion folgt mit Supabase</p>
          <div style={{ borderTop: "1px solid var(--da-border)", paddingTop: "20px", textAlign: "center" }}>
            <p style={{ color: "var(--da-muted)", fontSize: "14px" }}>Noch kein Konto? <a href="/registrieren" style={{ color: "var(--da-green)", fontWeight: 600, textDecoration: "none" }}>Jetzt registrieren</a></p>
          </div>
        </form>
      </section>
      <Footer />
    </main>
  );
}
