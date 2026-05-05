import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import PagePlaceholder from "@/components/PagePlaceholder";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Ressourcen" title="Tools & Ressources" description="KI-Plattformen, GenAI Prompts und Podcasts – alles was du für deine Arbeit mit KI brauchst an einem Ort." />
      <PagePlaceholder message="Tools, Prompts und Podcasts werden hier erscheinen." />
      <Footer />
    </main>
  );
}
