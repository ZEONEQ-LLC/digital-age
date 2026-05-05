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

const toolColor = (t: string) => t === "Claude" ? "var(--da-orange)" : t === "ChatGPT" ? "var(--da-green)" : "var(--da-purple)";
const diffColor = (d: string) => d === "Anfänger" ? "var(--da-green)" : d === "Fortgeschritten" ? "var(--da-orange)" : "var(--da-purple)";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Tools" title="GenAI Prompts" description="Getestete Prompts für ChatGPT, Claude und Gemini. Kuratiert und von der Community eingereicht." />

      {/* CTA + Filter */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 32px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
          <p style={{ color: "var(--da-muted)", fontSize: "15px" }}>Hast du einen grossartigen Prompt?</p>
          <a href="/ai-prompts/einreichen" style={{ backgroundColor: "var(--da-green)", color: "var(--da-dark)", padding: "10px 20px", borderRadius: "4px", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}>
            Prompt einreichen →
          </a>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "var(--da-muted)", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Filter:</span>
          {["Alle", "Business", "Kreativ", "Code", "Marketing", "Strategie", "Lernen"].map((f, i) => (
            <button key={f} style={{ backgroundColor: i === 0 ? "var(--da-green)" : "var(--da-card)", color: i === 0 ? "var(--da-dark)" : "var(--da-text-strong)", border: "1px solid var(--da-border)", padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>{f}</button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 32px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
          {prompts.map((p, i) => (
            <div key={i} style={{ backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px", padding: "24px", cursor: "pointer" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                <span style={{ color: "var(--da-green)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{p.category}</span>
                <span style={{ color: "var(--da-muted-soft)" }}>·</span>
                <span style={{ color: diffColor(p.difficulty), fontSize: "11px", fontWeight: 600 }}>{p.difficulty}</span>
              </div>
              <h3 style={{ color: "var(--da-text)", fontSize: "17px", fontWeight: 600, marginBottom: "12px", lineHeight: 1.3 }}>{p.title}</h3>
              <p style={{ color: "var(--da-muted)", fontSize: "13px", lineHeight: 1.55, marginBottom: "16px", fontFamily: "Roboto Mono, monospace", backgroundColor: "var(--da-dark)", padding: "10px", borderRadius: "4px" }}>{p.preview}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: toolColor(p.tool), fontSize: "12px", fontWeight: 600 }}>✦ {p.tool}</span>
                <span style={{ color: "var(--da-muted-soft)", fontSize: "12px" }}>von {p.author}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
