import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import Footer from "@/components/Footer";

const featured = [
  { name: "Claude", category: "LLM", tagline: "Anthropic's flagship AI assistant – safe, helpful, honest.", hosting: "US", pricing: "Free + Pro", logo: "https://picsum.photos/seed/claude/80" },
  { name: "ChatGPT", category: "LLM", tagline: "OpenAI's conversational AI with multimodal capabilities.", hosting: "US", pricing: "Free + Plus", logo: "https://picsum.photos/seed/gpt/80" },
  { name: "Swiss GPT", category: "LLM", tagline: "Swiss-hosted LLM for enterprise compliance.", hosting: "CH", pricing: "Enterprise", logo: "https://picsum.photos/seed/swissgpt/80" },
];

const platforms = [
  { name: "Midjourney", category: "Image", tagline: "State-of-the-art AI image generation.", hosting: "US", pricing: "Paid" },
  { name: "DALL-E 3", category: "Image", tagline: "OpenAI's image generation model.", hosting: "US", pricing: "Pay-per-use" },
  { name: "ElevenLabs", category: "Audio", tagline: "Realistic AI voice synthesis in many languages.", hosting: "US", pricing: "Free + Paid" },
  { name: "Runway", category: "Video", tagline: "AI video generation and editing tools.", hosting: "US", pricing: "Free + Paid" },
  { name: "GitHub Copilot", category: "Code", tagline: "AI pair programmer for developers.", hosting: "US", pricing: "Paid" },
  { name: "Cursor", category: "Code", tagline: "AI-first code editor built for productivity.", hosting: "US", pricing: "Free + Pro" },
  { name: "Mistral AI", category: "LLM", tagline: "European open-weight language models.", hosting: "EU", pricing: "Free + API" },
  { name: "Perplexity", category: "Search", tagline: "AI-powered search engine with citations.", hosting: "US", pricing: "Free + Pro" },
  { name: "Suno", category: "Audio", tagline: "Generate full songs with AI.", hosting: "US", pricing: "Free + Paid" },
];

const hostingColor = (h: string) => h === "CH" ? "var(--da-green)" : h === "EU" ? "var(--da-orange)" : "var(--da-muted)";

function PlatformCard({ p, featured = false }: { p: any; featured?: boolean }) {
  return (
    <div style={{ backgroundColor: "var(--da-card)", border: featured ? "1px solid var(--da-green)" : "1px solid var(--da-border)", borderRadius: "8px", padding: "24px", position: "relative" }}>
      {featured && <span style={{ position: "absolute", top: "12px", right: "12px", backgroundColor: "var(--da-green)", color: "var(--da-dark)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 8px", borderRadius: "4px" }}>Gesponsert</span>}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        {p.logo && <img src={p.logo} alt={p.name} style={{ width: "48px", height: "48px", borderRadius: "8px" }} />}
        <div>
          <h3 style={{ color: "var(--da-text)", fontSize: "18px", fontWeight: 600 }}>{p.name}</h3>
          <p style={{ color: "var(--da-green)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{p.category}</p>
        </div>
      </div>
      <p style={{ color: "var(--da-muted)", fontSize: "14px", lineHeight: 1.5, marginBottom: "16px", minHeight: "42px" }}>{p.tagline}</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ backgroundColor: "var(--da-dark)", color: hostingColor(p.hosting), border: `1px solid ${hostingColor(p.hosting)}`, fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "4px" }}>🌐 {p.hosting}</span>
        <span style={{ backgroundColor: "var(--da-dark)", color: "var(--da-muted)", border: "1px solid var(--da-border)", fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "4px" }}>💰 {p.pricing}</span>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Ressourcen" title="KI-Plattformen" description="Kuratierte Übersicht der wichtigsten KI-Tools und Plattformen – mit Fokus auf Enterprise-Tauglichkeit, Hosting-Region und Preismodell." />

      {/* Filter Bar */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 32px 0" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "var(--da-muted)", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Filter:</span>
          {["Alle Kategorien", "LLM", "Image", "Video", "Audio", "Code", "Search"].map((f, i) => (
            <button key={f} style={{ backgroundColor: i === 0 ? "var(--da-green)" : "var(--da-card)", color: i === 0 ? "var(--da-dark)" : "var(--da-text-strong)", border: "1px solid var(--da-border)", padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>{f}</button>
          ))}
          <select style={{ backgroundColor: "var(--da-card)", color: "var(--da-text-strong)", border: "1px solid var(--da-border)", padding: "8px 16px", borderRadius: "4px", fontSize: "13px", marginLeft: "auto" }}>
            <option>Alle Hosting-Regionen</option><option>Schweiz (CH)</option><option>EU</option><option>USA</option>
          </select>
        </div>
      </section>

      {/* Featured */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 32px 0" }}>
        <h2 style={{ color: "var(--da-text)", fontSize: "22px", fontWeight: 700, marginBottom: "24px" }}>⭐ Featured</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {featured.map((p, i) => <PlatformCard key={i} p={p} featured />)}
        </div>
      </section>

      {/* All Platforms */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 32px 80px" }}>
        <h2 style={{ color: "var(--da-text)", fontSize: "22px", fontWeight: 700, marginBottom: "24px" }}>Alle Plattformen</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {platforms.map((p, i) => <PlatformCard key={i} p={p} />)}
        </div>
      </section>

      <Footer />
    </main>
  );
}
