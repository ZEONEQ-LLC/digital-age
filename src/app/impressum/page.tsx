import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Rechtliches" title="Impressum" />
      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "64px 32px", color: "#b0b0b0", fontSize: "16px", lineHeight: 1.7 }}>
        <h3 style={{ color: "#ffffff", fontSize: "20px", fontWeight: 600, marginBottom: "16px" }}>Herausgeber</h3>
        <p style={{ marginBottom: "24px" }}>digital-age.ch<br />Schweiz</p>
        <h3 style={{ color: "#ffffff", fontSize: "20px", fontWeight: 600, marginBottom: "16px" }}>Kontakt</h3>
        <p style={{ marginBottom: "24px" }}>E-Mail: hello@digital-age.ch</p>
        <p style={{ color: "#666", fontSize: "14px" }}>Vollständige Angaben werden ergänzt.</p>
      </section>
      <Footer />
    </main>
  );
}
