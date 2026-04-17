import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import PagePlaceholder from "@/components/PagePlaceholder";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Über uns" title="Über digital age" description="digital age ist das Magazin für Künstliche Intelligenz und Zukunftstechnologien in der DACH-Region. Wir helfen Unternehmen, KI zu verstehen und sinnvoll einzusetzen." />
      <PagePlaceholder message="Mehr über uns folgt hier." />
      <Footer />
    </main>
  );
}
