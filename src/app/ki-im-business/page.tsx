import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import PagePlaceholder from "@/components/PagePlaceholder";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Themen" title="KI & Business" description="Wie Künstliche Intelligenz Unternehmen transformiert – Strategien, Praxisbeispiele und Entscheidungshilfen für die DACH-Region." />
      <PagePlaceholder message="Artikel zu KI & Business werden hier erscheinen." />
      <Footer />
    </main>
  );
}
