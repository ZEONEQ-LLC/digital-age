import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";

const featured = [
  { name: "DeepJudge", tagline: "KI für Anwaltskanzleien – Dokumentenanalyse in Sekunden.", city: "Zürich", industry: "LegalTech", status: "Swiss Based", employees: "11–50" },
  { name: "LatticeFlow AI", tagline: "Enterprise AI trust & compliance platform.", city: "Zürich", industry: "AI Governance", status: "Swiss Founded", employees: "51–200" },
  { name: "Unique AG", tagline: "FinTech AI-Assistenten für Relationship Manager.", city: "Zürich", industry: "FinTech", status: "Swiss Based", employees: "11–50" },
];

const startups = [
  { name: "Squirro", tagline: "Cognitive Search für Banking & Versicherung.", city: "Zürich", industry: "FinTech", status: "Swiss Based", employees: "51–200" },
  { name: "Visium", tagline: "Data Science Beratung & KI-Lösungen.", city: "Lausanne", industry: "Consulting", status: "Swiss Based", employees: "51–200" },
  { name: "Nexoya", tagline: "KI-gesteuerte Marketing-Optimierung.", city: "Zürich", industry: "MarTech", status: "Swiss Based", employees: "11–50" },
  { name: "Advertima", tagline: "Computer Vision für Retail Analytics.", city: "St. Gallen", industry: "Retail", status: "Swiss Based", employees: "11–50" },
  { name: "Faktion", tagline: "Conversational AI für Enterprises.", city: "Zürich", industry: "Enterprise", status: "Active in CH", employees: "51–200" },
  { name: "Scandit", tagline: "Smart Data Capture mit Computer Vision.", city: "Zürich", industry: "Logistics", status: "Swiss Based", employees: "200+" },
  { name: "Tinamu Labs", tagline: "Autonome Drohnen-KI für Industrie.", city: "Zürich", industry: "Robotics", status: "Swiss Based", employees: "11–50" },
  { name: "Modulos", tagline: "AI Governance & Compliance Platform.", city: "Zürich", industry: "AI Governance", status: "Swiss Based", employees: "11–50" },
  { name: "Sherpany", tagline: "AI-powered Meeting Management für Boards.", city: "Zürich", industry: "Enterprise", status: "Swiss Based", employees: "51–200" },
];

const statusColor = (s: string) => s === "Swiss Based" ? "var(--da-green)" : s === "Swiss Founded" ? "var(--da-orange)" : "var(--da-purple)";

function StartupCard({ s, featured = false }: { s: any; featured?: boolean }) {
  return (
    <div style={{ backgroundColor: "var(--da-card)", border: featured ? "1px solid var(--da-green)" : "1px solid var(--da-border)", borderRadius: "8px", padding: "24px", position: "relative" }}>
      {featured && <span style={{ position: "absolute", top: "12px", right: "12px", backgroundColor: "var(--da-green)", color: "var(--da-dark)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 8px", borderRadius: "4px" }}>Featured</span>}
      <h3 style={{ color: "var(--da-text)", fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>{s.name}</h3>
      <p style={{ color: "var(--da-muted)", fontSize: "14px", lineHeight: 1.5, marginBottom: "16px", minHeight: "42px" }}>{s.tagline}</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        <span style={{ backgroundColor: "var(--da-dark)", color: statusColor(s.status), border: `1px solid ${statusColor(s.status)}`, fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "4px" }}>🇨🇭 {s.status}</span>
        <span style={{ backgroundColor: "var(--da-dark)", color: "var(--da-muted)", border: "1px solid var(--da-border)", fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "4px" }}>📍 {s.city}</span>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ color: "var(--da-green)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.industry}</span>
        <span style={{ color: "var(--da-muted-soft)" }}>·</span>
        <span style={{ color: "var(--da-muted)", fontSize: "11px", fontWeight: 500 }}>{s.employees} MA</span>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />

      {/* Hero */}
      <section style={{ padding: "64px 32px", borderBottom: "1px solid var(--da-card)", background: "linear-gradient(135deg, var(--da-dark) 0%, var(--da-card) 100%)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p style={{ color: "var(--da-green)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>🇨🇭 Swiss AI Landscape</p>
          <h1 style={{ color: "var(--da-text)", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700, lineHeight: 1.15, marginBottom: "20px", fontFamily: "Space Grotesk, sans-serif", maxWidth: "900px" }}>
            Die Schweizer KI-Landschaft – <span style={{ color: "var(--da-green)" }}>an einem Ort.</span>
          </h1>
          <p style={{ color: "var(--da-muted)", fontSize: "18px", lineHeight: 1.6, maxWidth: "720px", marginBottom: "32px" }}>
            Kuratierte Übersicht von KI-Unternehmen und Startups mit Sitz oder Präsenz in der Schweiz. Finde die passende Lösung für dein Unternehmen – mit Fokus auf Datenschutz und Schweizer Werte.
          </p>
          <a href="/swiss-ai/einreichen" style={{ display: "inline-block", backgroundColor: "var(--da-green)", color: "var(--da-dark)", padding: "14px 28px", borderRadius: "4px", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}>
            Dein Unternehmen listen →
          </a>
        </div>
      </section>

      {/* Filter */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 32px 0" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "var(--da-muted)", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Filter:</span>
          {["Alle Branchen", "FinTech", "HealthTech", "LegalTech", "Retail", "Enterprise"].map((f, i) => (
            <button key={f} style={{ backgroundColor: i === 0 ? "var(--da-green)" : "var(--da-card)", color: i === 0 ? "var(--da-dark)" : "var(--da-text-strong)", border: "1px solid var(--da-border)", padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>{f}</button>
          ))}
          <select style={{ backgroundColor: "var(--da-card)", color: "var(--da-text-strong)", border: "1px solid var(--da-border)", padding: "8px 16px", borderRadius: "4px", fontSize: "13px", marginLeft: "auto" }}>
            <option>Alle Standorte</option><option>Zürich</option><option>Genf</option><option>Lausanne</option><option>Basel</option>
          </select>
        </div>
      </section>

      {/* Featured */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 32px 0" }}>
        <h2 style={{ color: "var(--da-text)", fontSize: "22px", fontWeight: 700, marginBottom: "24px" }}>⭐ Featured Startups</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {featured.map((s, i) => <StartupCard key={i} s={s} featured />)}
        </div>
      </section>

      {/* All */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 32px 80px" }}>
        <h2 style={{ color: "var(--da-text)", fontSize: "22px", fontWeight: 700, marginBottom: "24px" }}>Alle Schweizer KI-Unternehmen</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {startups.map((s, i) => <StartupCard key={i} s={s} />)}
        </div>
      </section>

      <Footer />
    </main>
  );
}
