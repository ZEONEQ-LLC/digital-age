import { buildListingMetadata } from "@/lib/listingMetadata";

// Die Seite ist eine Client-Komponente und kann keine Metadaten exportieren.
// Ohne dieses Layout erbt sie Titel und Beschreibung der Startseite.
export const metadata = buildListingMetadata({
  path: "/ai-prompts/einreichen",
  title: "Prompt einreichen — AI Prompts auf digital age",
  description:
    "Teile deinen besten Prompt für ChatGPT, Claude oder Gemini. Die Redaktion prüft jede Einreichung und publiziert gute Prompts mit deiner Attribution.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
