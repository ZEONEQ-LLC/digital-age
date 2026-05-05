import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Transparenz" title="KI-Transparenz" description="Wie wir KI bei digital age einsetzen – offen und nachvollziehbar." />
      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "64px 32px", color: "var(--da-muted)", fontSize: "16px", lineHeight: 1.7 }}>
        <p style={{ marginBottom: "16px" }}>Wir nutzen KI-Tools bei der Recherche, Redaktion und Content-Erstellung. Jeder Beitrag wird jedoch von Menschen geprüft und freigegeben.</p>
        <p style={{ marginBottom: "16px" }}>News-Items, die automatisch generiert werden, sind als solche gekennzeichnet. Meinungsartikel und Analysen stammen immer von realen Autorinnen und Autoren.</p>
        <p>Detaillierte Transparenz-Richtlinien folgen.</p>
      </section>
      <Footer />
    </main>
  );
}
