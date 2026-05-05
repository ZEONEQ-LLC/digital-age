import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import PagePlaceholder from "@/components/PagePlaceholder";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Team" title="Redaktion" description="Die Menschen hinter digital age – Autorinnen, Autoren und Expertinnen, die das Magazin mit Leben füllen." />
      <PagePlaceholder message="Redaktionsteam folgt hier." />
      <Footer />
    </main>
  );
}
