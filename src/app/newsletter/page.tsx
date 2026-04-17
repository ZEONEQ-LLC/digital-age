import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import NewsletterSignup from "@/components/NewsletterSignup";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />

      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{ color: "#32ff7e", fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>📬 Newsletter</p>
          <h1 style={{ color: "#ffffff", fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700, lineHeight: 1.15, marginBottom: "20px", fontFamily: "Space Grotesk, sans-serif" }}>
            KI & Future Tech – <span style={{ color: "#32ff7e" }}>direkt in deine Inbox.</span>
          </h1>
          <p style={{ color: "#b0b0b0", fontSize: "19px", lineHeight: 1.6, maxWidth: "640px", margin: "0 auto" }}>
            Jede Woche eine kuratierte Auswahl der wichtigsten Entwicklungen – kurz, relevant, ohne Hype. Für Entscheider und Interessierte in der DACH-Region.
          </p>
        </div>

        {/* Value Props */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "48px" }}>
          {[
            { icon: "📰", title: "Top-Artikel", desc: "Die 5 wichtigsten KI-News der Woche auf den Punkt gebracht." },
            { icon: "🇨🇭", title: "Swiss AI Spotlight", desc: "Ein neues Schweizer KI-Unternehmen pro Ausgabe im Fokus." },
            { icon: "🎯", title: "Kuratierte Prompts", desc: "Ein getesteter Prompt den du sofort anwenden kannst." },
            { icon: "💡", title: "Tools & Insights", desc: "Neue Plattformen und praktische Einsichten für den Business-Alltag." },
          ].map((v, i) => (
            <div key={i} style={{ backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: "8px", padding: "24px" }}>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>{v.icon}</div>
              <h3 style={{ color: "#ffffff", fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>{v.title}</h3>
              <p style={{ color: "#b0b0b0", fontSize: "14px", lineHeight: 1.6 }}>{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Signup Form */}
        <div style={{ maxWidth: "500px", margin: "0 auto" }}>
          <NewsletterSignup variant="full" />
        </div>

        {/* Stats / Trust */}
        <div style={{ marginTop: "64px", padding: "32px", textAlign: "center", borderTop: "1px solid #2a2a2e" }}>
          <div style={{ display: "flex", gap: "48px", justifyContent: "center", flexWrap: "wrap" }}>
            <div>
              <p style={{ color: "#32ff7e", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", lineHeight: 1 }}>1×</p>
              <p style={{ color: "#b0b0b0", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "6px" }}>pro Woche</p>
            </div>
            <div>
              <p style={{ color: "#32ff7e", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", lineHeight: 1 }}>5 min</p>
              <p style={{ color: "#b0b0b0", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "6px" }}>Lesezeit</p>
            </div>
            <div>
              <p style={{ color: "#32ff7e", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", lineHeight: 1 }}>0 ₣</p>
              <p style={{ color: "#b0b0b0", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "6px" }}>kostenlos</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
