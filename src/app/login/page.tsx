import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";

const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "#1c1c1e", color: "#ffffff", border: "1px solid #3a3a3e", borderRadius: "4px", padding: "14px 16px", fontSize: "15px", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", color: "#e0e0e0", fontSize: "14px", fontWeight: 600, marginBottom: "8px" };

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={{ maxWidth: "440px", margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ color: "#ffffff", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", marginBottom: "8px" }}>Willkommen zurück</h1>
          <p style={{ color: "#b0b0b0", fontSize: "15px" }}>Melde dich in deinem Autoren-Account an</p>
        </div>
        <form style={{ backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: "8px", padding: "32px" }}>
          <div style={{ marginBottom: "20px" }}><label style={labelStyle}>E-Mail</label><input type="email" style={inputStyle} placeholder="du@beispiel.ch" /></div>
          <div style={{ marginBottom: "8px" }}><label style={labelStyle}>Passwort</label><input type="password" style={inputStyle} placeholder="••••••••" /></div>
          <div style={{ textAlign: "right", marginBottom: "24px" }}>
            <a href="#" style={{ color: "#32ff7e", fontSize: "13px", textDecoration: "none" }}>Passwort vergessen?</a>
          </div>
          <button type="button" style={{ backgroundColor: "#32ff7e", color: "#1c1c1e", border: "none", padding: "14px", borderRadius: "4px", fontSize: "15px", fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: "20px" }}>Anmelden</button>
          <p style={{ color: "#666", fontSize: "12px", lineHeight: 1.5, textAlign: "center", marginBottom: "20px" }}>Platzhalter – Login-Funktion folgt mit Supabase</p>
          <div style={{ borderTop: "1px solid #3a3a3e", paddingTop: "20px", textAlign: "center" }}>
            <p style={{ color: "#b0b0b0", fontSize: "14px" }}>Noch kein Konto? <a href="/registrieren" style={{ color: "#32ff7e", fontWeight: 600, textDecoration: "none" }}>Jetzt registrieren</a></p>
          </div>
        </form>
      </section>
      <Footer />
    </main>
  );
}
