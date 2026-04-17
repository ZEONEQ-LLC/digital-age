import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import Footer from "@/components/Footer";

const prompts = [
  { category: "Business", title: "ChatGPT SEO-Bot", preview: "Du bist ein SEO-Experte mit 10 Jahren Erfahrung. Analysiere folgende Webseite und gib mir...", tool: "ChatGPT", author: "Ali Soy", difficulty: "Fortgeschritten" },
  { category: "Kreativ", title: "Pizzastück als Superheld", preview: "Stelle dir ein Pizzastück als Marvel-Superheld vor. Beschreibe Charakter, Herkunft, Superkräfte...", tool: "Claude", author: "Ali Soy", difficulty: "Anfänger" },
  { category: "Business", title: "Meeting-Protokoll automatisieren", preview: "Du bekommst ein Transkript eines Business-Meetings. Erstelle ein strukturiertes Protokoll mit...", tool: "Claude", author: "Matthias Zwingli", difficulty: "Fortgeschritten" },
  { category: "Code", title: "Code Review Assistant", preview: "Reviewe folgenden Code auf Performance, Security und Best Practices. Gib konkrete Verbesserungsvorschläge...", tool: "ChatGPT", author: "Andreas Kamm", difficulty: "Expert" },
  { category: "Lernen", title: "Feynman-Technik Tutor", preview: "Erkläre mir das Konzept [X] so einfach, dass ein 12-Jähriger es versteht. Verwende Analogien aus dem Alltag...", tool: "Gemini", author: "Ali Soy", difficulty: "Anfänger" },
  { category: "Strategie", title: "Vom Feuer zur KI", preview: "Welche fundamentalen Prinzipien haben wir seit der Entdeckung des Feuers noch nicht vollständig entschlüsselt?", tool: "Claude", author: "Ali Soy", difficulty: "Expert" },
  { category: "Marketing", title: "LinkedIn Post Generator", preview: "Schreibe einen LinkedIn-Post über [Thema]. Struktur: Hook in Zeile 1, Kontext in 2-3, Insight in 4-6...", tool: "ChatGPT", author: "Matthias Zwingli", difficulty: "Fortgeschritten" },
  { category: "Business", title: "Kunden-Email Refinement", preview: "Verbessere folgende Kunden-Email: behalte den Kern, aber mache sie professioneller und klarer...", tool: "Claude", author: "Andreas Kamm", difficulty: "Anfänger" },
];

const toolColor = (t: string) => t === "Claude" ? "#ff8c42" : t === "ChatGPT" ? "#32ff7e" : "#dcd6f7";
const diffColor = (d: string) => d === "Anfänger" ? "#32ff7e" : d === "Fortgeschritten" ? "#ff8c42" : "#dcd6f7";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Tools" title="GenAI Prompts" description="Getestete Prompts für ChatGPT, Claude und Gemini. Kuratiert und von der Community eingereicht." />

      {/* CTA + Filter */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 32px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
          <p style={{ color: "#b0b0b0", fontSize: "15px" }}>Hast du einen grossartigen Prompt?</p>
          <a href="/ai-prompts/einreichen" style={{ backgroundColor: "#32ff7e", color: "#1c1c1e", padding: "10px 20px", borderRadius: "4px", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}>
            Prompt einreichen →
          </a>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "#b0b0b0", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Filter:</span>
          {["Alle", "Business", "Kreativ", "Code", "Marketing", "Strategie", "Lernen"].map((f, i) => (
            <button key={f} style={{ backgroundColor: i === 0 ? "#32ff7e" : "#2a2a2e", color: i === 0 ? "#1c1c1e" : "#e0e0e0", border: "1px solid #3a3a3e", padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>{f}</button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 32px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
          {prompts.map((p, i) => (
            <div key={i} style={{ backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: "8px", padding: "24px", cursor: "pointer" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                <span style={{ color: "#32ff7e", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{p.category}</span>
                <span style={{ color: "#666" }}>·</span>
                <span style={{ color: diffColor(p.difficulty), fontSize: "11px", fontWeight: 600 }}>{p.difficulty}</span>
              </div>
              <h3 style={{ color: "#ffffff", fontSize: "17px", fontWeight: 600, marginBottom: "12px", lineHeight: 1.3 }}>{p.title}</h3>
              <p style={{ color: "#b0b0b0", fontSize: "13px", lineHeight: 1.55, marginBottom: "16px", fontFamily: "Roboto Mono, monospace", backgroundColor: "#1c1c1e", padding: "10px", borderRadius: "4px" }}>{p.preview}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: toolColor(p.tool), fontSize: "12px", fontWeight: 600 }}>✦ {p.tool}</span>
                <span style={{ color: "#666", fontSize: "12px" }}>von {p.author}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
