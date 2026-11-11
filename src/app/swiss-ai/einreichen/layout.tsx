import { buildListingMetadata } from "@/lib/listingMetadata";

// Die Seite ist eine Client-Komponente und kann keine Metadaten exportieren.
// Ohne dieses Layout erbt sie Titel und Beschreibung der Startseite.
export const metadata = buildListingMetadata({
  path: "/swiss-ai/einreichen",
  title: "Unternehmen eintragen — Swiss AI Verzeichnis",
  description:
    "Trag dein Schweizer KI-Unternehmen kostenlos ins Swiss-AI-Verzeichnis von digital age ein. Geprüft in 5 Werktagen, danach für alle sichtbar.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
