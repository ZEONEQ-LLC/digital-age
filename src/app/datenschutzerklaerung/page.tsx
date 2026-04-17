import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Rechtliches" title="Datenschutzerklärung" />
      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "64px 32px", color: "#b0b0b0", fontSize: "16px", lineHeight: 1.7 }}>
        <p style={{ marginBottom: "16px" }}>Wir nehmen den Schutz deiner Daten ernst. Diese Seite wird in Kürze mit einer vollständigen Datenschutzerklärung ergänzt.</p>
        <p style={{ marginBottom: "16px" }}>Bis dahin gilt: Wir erheben keine personenbezogenen Daten ausser wenn du uns aktiv kontaktierst.</p>
      </section>
      <Footer />
    </main>
  );
}
