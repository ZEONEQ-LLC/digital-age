import { buildListingMetadata } from "@/lib/listingMetadata";

// Die Seite ist eine Client-Komponente und kann keine Metadaten exportieren.
// Ohne dieses Layout erbt sie Titel und Beschreibung der Startseite.
export const metadata = buildListingMetadata({
  path: "/artikel-pitchen",
  title: "Artikel pitchen — Gastbeitrag für digital age einreichen",
  description:
    "Du hast ein Thema, das die Tech-Szene in der Schweiz und im DACH-Raum bewegen sollte? Reich Titel, Abstract und Volltext ein. Antwort innert 5 Werktagen.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
