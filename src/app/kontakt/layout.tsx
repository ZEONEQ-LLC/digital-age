import { buildListingMetadata } from "@/lib/listingMetadata";

// Die Seite ist eine Client-Komponente und kann keine Metadaten exportieren.
// Ohne dieses Layout erbt sie Titel und Beschreibung der Startseite.
export const metadata = buildListingMetadata({
  path: "/kontakt",
  title: "Kontakt — digital age",
  description:
    "Eine Frage, ein Hinweis, eine Idee zur Zusammenarbeit: So erreichst du die Redaktion von digital age, dem Schweizer Magazin für KI und Future Tech.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
