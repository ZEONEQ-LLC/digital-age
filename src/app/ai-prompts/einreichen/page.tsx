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
      <PageHero category="Community" title="Prompt einreichen" description="Teile deinen besten Prompt mit der Community. Wir prüfen und publizieren qualitative Beiträge." />

      <section style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 32px" }}>
        <form style={{ backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: "8px", padding: "32px" }}>
          <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>Der Prompt</h3>
          <div style={groupStyle}><label style={labelStyle}>Titel *</label><input type="text" style={inputStyle} placeholder="z.B. 'LinkedIn Post Generator'" /></div>
          <div style={groupStyle}><label style={labelStyle}>Prompt-Text *</label><textarea rows={8} style={{ ...inputStyle, fontFamily: "Roboto Mono, monospace", fontSize: "14px" }} placeholder="Der vollständige Prompt. Nutze {{platzhalter}} für Variablen."></textarea></div>
          <div style={groupStyle}><label style={labelStyle}>Kontext & Anwendung *</label><textarea rows={4} style={inputStyle} placeholder="Wofür nutzt du diesen Prompt? Was ist der Use Case?"></textarea></div>
          <div style={groupStyle}><label style={labelStyle}>Beispiel-Output (optional)</label><textarea rows={4} style={inputStyle} placeholder="Ein Beispiel was die KI ausspuckt, wenn man den Prompt nutzt."></textarea></div>

          <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, margin: "32px 0 20px" }}>Klassifizierung</h3>
          <div style={groupStyle}><label style={labelStyle}>Kategorie *</label><select style={inputStyle}><option>Business</option><option>Kreativ</option><option>Code</option><option>Marketing</option><option>Strategie</option><option>Lernen</option><option>Andere</option></select></div>
          <div style={groupStyle}><label style={labelStyle}>Getestet mit *</label><select style={inputStyle}><option>ChatGPT</option><option>Claude</option><option>Gemini</option><option>Mehrere Tools</option></select></div>
          <div style={groupStyle}><label style={labelStyle}>Schwierigkeit *</label><select style={inputStyle}><option>Anfänger</option><option>Fortgeschritten</option><option>Expert</option></select></div>

          <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, margin: "32px 0 20px" }}>Über dich</h3>
          <div style={groupStyle}><label style={labelStyle}>Name / Pseudonym *</label><input type="text" style={inputStyle} placeholder="Wie wir dich nennen sollen" /></div>
          <div style={groupStyle}><label style={labelStyle}>E-Mail *</label><input type="email" style={inputStyle} placeholder="Für Rückmeldung (nicht öffentlich)" /></div>
          <div style={groupStyle}><label style={labelStyle}>LinkedIn / Website (optional)</label><input type="url" style={inputStyle} placeholder="https://..." /></div>

          <div style={{ ...groupStyle, display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <input type="checkbox" style={{ marginTop: "4px" }} />
            <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 400 }}>Ich erlaube digital age die Publikation meines Prompts und bestätige, dass er mein eigener bzw. frei nutzbar ist.</label>
          </div>

          <button type="button" style={{ backgroundColor: "#32ff7e", color: "#1c1c1e", border: "none", padding: "14px 32px", borderRadius: "4px", fontSize: "15px", fontWeight: 700, cursor: "pointer", width: "100%" }}>
            Prompt zur Prüfung einreichen →
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
