import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import PagePlaceholder from "@/components/PagePlaceholder";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Themen" title="Future Tech" description="Zukunftstechnologien im Überblick – IoT, Blockchain, Quantum Computing und mehr. Was Unternehmen heute wissen müssen." />
      <PagePlaceholder message="Artikel zu Future Tech werden hier erscheinen." />
      <Footer />
    </main>
  );
}
