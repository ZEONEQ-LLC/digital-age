import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Kontakt" title="Kontakt & Publizieren" description="Du möchtest einen Artikel auf digital age veröffentlichen oder hast eine Frage? Schreib uns." />
      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px", padding: "48px" }}>
          <h2 style={{ color: "var(--da-text)", fontSize: "24px", fontWeight: 600, marginBottom: "16px" }}>Kontaktformular folgt</h2>
          <p style={{ color: "var(--da-muted)", fontSize: "16px", lineHeight: 1.6, marginBottom: "24px" }}>Bis dahin erreichst du uns direkt per E-Mail.</p>
          <a href="mailto:hello@digital-age.ch" style={{ display: "inline-block", backgroundColor: "var(--da-green)", color: "var(--da-dark)", padding: "14px 28px", borderRadius: "4px", fontWeight: 700, textDecoration: "none", fontSize: "15px" }}>
            hello@digital-age.ch
          </a>
        </div>
      </section>
      <Footer />
    </main>
  );
}
