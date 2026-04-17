"use client";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";

const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "#1c1c1e", color: "#ffffff", border: "1px solid #3a3a3e", borderRadius: "4px", padding: "12px 16px", fontSize: "15px", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", color: "#e0e0e0", fontSize: "14px", fontWeight: 600, marginBottom: "8px" };
const groupStyle: React.CSSProperties = { marginBottom: "24px" };
const hintStyle: React.CSSProperties = { color: "#666", fontSize: "12px", marginTop: "4px" };

const expertiseAreas = ["KI & ML", "Banking & FinTech", "HealthTech", "LegalTech", "Blockchain", "IoT", "Future Tech", "Compliance", "Datenschutz", "Business Strategy", "Marketing", "Code & Dev"];

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <p style={{ color: "#32ff7e", fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>Schritt 2 von 2</p>
          <h1 style={{ color: "#ffffff", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", marginBottom: "12px" }}>Dein Autoren-Profil</h1>
          <p style={{ color: "#b0b0b0", fontSize: "15px", lineHeight: 1.5 }}>Diese Informationen werden auf deiner öffentlichen Autorenseite angezeigt (nach Freischaltung).</p>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
          <div style={{ flex: 1, height: "4px", backgroundColor: "#32ff7e", borderRadius: "2px" }} />
          <div style={{ flex: 1, height: "4px", backgroundColor: "#32ff7e", borderRadius: "2px" }} />
        </div>

        <form style={{ backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: "8px", padding: "32px" }}>

          <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>Persönlich</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div><label style={labelStyle}>Vorname *</label><input type="text" style={inputStyle} /></div>
            <div><label style={labelStyle}>Nachname *</label><input type="text" style={inputStyle} /></div>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Position / Rolle *</label>
            <input type="text" style={inputStyle} placeholder="z.B. CTO bei XY, Freier Journalist, AI Researcher" />
            <p style={hintStyle}>Was machst du beruflich?</p>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Portrait-Foto *</label>
            <div style={{ border: "2px dashed #3a3a3e", borderRadius: "8px", padding: "32px", textAlign: "center", cursor: "pointer" }}>
              <p style={{ color: "#b0b0b0", fontSize: "14px" }}>📷 Foto hochladen</p>
              <p style={{ color: "#666", fontSize: "12px", marginTop: "4px" }}>JPG oder PNG, mind. 400×400px</p>
            </div>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Kurz-Bio *</label>
            <textarea rows={4} maxLength={500} style={{ ...inputStyle, fontFamily: "Inter, sans-serif" }} placeholder="Wer bist du? Was sind deine Themen? (max. 500 Zeichen)" />
            <p style={hintStyle}>Erscheint auf deiner öffentlichen Autor-Seite.</p>
          </div>

          <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, margin: "32px 0 20px" }}>Expertise</h3>
          <div style={groupStyle}>
            <label style={labelStyle}>Themenbereiche * (mehrfach möglich)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
              {expertiseAreas.map(area => (
                <label key={area} style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#1c1c1e", border: "1px solid #3a3a3e", borderRadius: "4px", padding: "8px 12px", cursor: "pointer", fontSize: "13px", color: "#e0e0e0" }}>
                  <input type="checkbox" />
                  {area}
                </label>
              ))}
            </div>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Publiziere auf * (mehrfach möglich)</label>
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              {["Deutsch", "English", "Français", "Italiano"].map(lang => (
                <label key={lang} style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#e0e0e0", fontSize: "14px" }}>
                  <input type="checkbox" />
                  {lang}
                </label>
              ))}
            </div>
          </div>

          <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, margin: "32px 0 20px" }}>Online-Präsenz</h3>
          <div style={groupStyle}>
            <label style={labelStyle}>LinkedIn-Profil *</label>
            <input type="url" style={inputStyle} placeholder="https://www.linkedin.com/in/..." />
            <p style={hintStyle}>Wichtig als Trust-Signal für unsere Leser.</p>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Website / Blog</label>
            <input type="url" style={inputStyle} placeholder="https://..." />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Twitter / X</label>
            <input type="url" style={inputStyle} placeholder="https://x.com/..." />
          </div>

          <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, margin: "32px 0 20px" }}>Motivation</h3>
          <div style={groupStyle}>
            <label style={labelStyle}>Warum möchtest du bei digital age publizieren? *</label>
            <textarea rows={4} style={inputStyle} placeholder="Was bringst du mit? Welche Themen möchtest du abdecken?" />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Bereits publizierte Artikel (optional)</label>
            <input type="url" style={{ ...inputStyle, marginBottom: "8px" }} placeholder="https://..." />
            <input type="url" style={{ ...inputStyle, marginBottom: "8px" }} placeholder="https://..." />
            <input type="url" style={inputStyle} placeholder="https://..." />
            <p style={hintStyle}>Bis zu 3 Referenzen.</p>
          </div>

          <button type="button" onClick={() => window.location.href = "/autor/wartezimmer"} style={{ backgroundColor: "#32ff7e", color: "#1c1c1e", border: "none", padding: "14px", borderRadius: "4px", fontSize: "15px", fontWeight: 700, cursor: "pointer", width: "100%" }}>Profil zur Prüfung einreichen →</button>

          <p style={{ color: "#666", fontSize: "12px", lineHeight: 1.5, marginTop: "16px", textAlign: "center" }}>Platzhalter – Profil-Speicherung folgt mit Supabase</p>
        </form>
      </section>
      <Footer />
    </main>
  );
}
