import { buildListingMetadata } from "@/lib/listingMetadata";
import KIPlattformenClient from "./KIPlattformenClient";

export const metadata = buildListingMetadata({
  path: "/ki-plattformen",
  title: "KI-Plattformen — Übersicht, Vergleich und Hosting-Region",
  description:
    "Kuratierte Übersicht der wichtigsten KI-Plattformen für Text, Bild, Audio, Video und Code — mit Hosting-Region, Preis-Modell und direktem Vergleich.",
});

export default function Page() {
  return <KIPlattformenClient />;
}
