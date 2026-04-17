import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import Footer from "@/components/Footer";

const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "#1c1c1e", color: "#ffffff", border: "1px solid #3a3a3e", borderRadius: "4px", padding: "12px 16px", fontSize: "15px", fontFamily: "Inter, sans-serif", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", color: "#e0e0e0", fontSize: "14px", fontWeight: 600, marginBottom: "8px" };
const groupStyle: React.CSSProperties = { marginBottom: "24px" };

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Swiss AI" title="Dein Unternehmen listen" description="Du betreibst ein KI-Unternehmen mit Schweizer Bezug? Reiche dein Listing ein – wir prüfen und publizieren innerhalb von 5 Werktagen." />

      <section style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 32px" }}>
        <form style={{ backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: "8px", padding: "32px" }}>
          <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>Unternehmens-Info</h3>
          <div style={groupStyle}><label style={labelStyle}>Name des Unternehmens *</label><input type="text" style={inputStyle} placeholder="z.B. DeepJudge" /></div>
          <div style={groupStyle}><label style={labelStyle}>Tagline (max. 100 Zeichen) *</label><input type="text" maxLength={100} style={inputStyle} placeholder="Was macht ihr in einem Satz?" /></div>
          <div style={groupStyle}><label style={labelStyle}>Beschreibung *</label><textarea rows={5} style={{ ...inputStyle, fontFamily: "Inter, sans-serif" }} placeholder="Was bietet euer Unternehmen? Für wen?"></textarea></div>
          <div style={groupStyle}><label style={labelStyle}>Website *</label><input type="url" style={inputStyle} placeholder="https://..." /></div>
          <div style={groupStyle}><label style={labelStyle}>Logo-URL</label><input type="url" style={inputStyle} placeholder="https://... (oder später uploaden)" /></div>

          <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, margin: "32px 0 20px" }}>Klassifizierung</h3>
          <div style={groupStyle}><label style={labelStyle}>Swiss-Status *</label><select style={inputStyle}><option>Swiss Based (Hauptsitz in CH)</option><option>Swiss Founded (CH-Gründer, international)</option><option>Active in CH (Internationale Firma, CH-Präsenz)</option></select></div>
          <div style={groupStyle}><label style={labelStyle}>Branche *</label><select style={inputStyle}><option>FinTech</option><option>HealthTech</option><option>LegalTech</option><option>MarTech</option><option>Enterprise</option><option>Retail</option><option>Robotics</option><option>Logistics</option><option>Consulting</option><option>Andere</option></select></div>
          <div style={groupStyle}><label style={labelStyle}>Stadt (Hauptsitz) *</label><input type="text" style={inputStyle} placeholder="z.B. Zürich" /></div>
          <div style={groupStyle}><label style={labelStyle}>Anzahl Mitarbeitende *</label><select style={inputStyle}><option>1–10</option><option>11–50</option><option>51–200</option><option>200+</option></select></div>
          <div style={groupStyle}><label style={labelStyle}>Gründungsjahr</label><input type="number" min={1990} max={2026} style={inputStyle} placeholder="2020" /></div>

          <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, margin: "32px 0 20px" }}>Kontakt</h3>
          <div style={groupStyle}><label style={labelStyle}>Dein Name *</label><input type="text" style={inputStyle} /></div>
          <div style={groupStyle}><label style={labelStyle}>E-Mail *</label><input type="email" style={inputStyle} /></div>
          <div style={groupStyle}><label style={labelStyle}>Rolle im Unternehmen</label><input type="text" style={inputStyle} placeholder="z.B. CEO, Marketing Manager" /></div>

          <div style={{ ...groupStyle, display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <input type="checkbox" style={{ marginTop: "4px" }} />
            <label style={{ ...labelStyle, marginBottom: 0 }}>Ich bestätige, dass die Angaben korrekt sind und ich berechtigt bin, das Unternehmen hier einzutragen.</label>
          </div>

          <button type="button" style={{ backgroundColor: "#32ff7e", color: "#1c1c1e", border: "none", padding: "14px 32px", borderRadius: "4px", fontSize: "15px", fontWeight: 700, cursor: "pointer", width: "100%" }}>
            Zur Prüfung einreichen →
          </button>

          <p style={{ color: "#666", fontSize: "12px", lineHeight: 1.5, marginTop: "16px", textAlign: "center" }}>
            Dieses Formular ist noch ein Platzhalter. Die Einreichung wird bald aktiv.
          </p>
        </form>
      </section>

      <Footer />
    </main>
  );
}
