import { buildListingMetadata } from "@/lib/listingMetadata";
import { getPlatformDirectory } from "@/lib/platformsApi";
import KIPlattformenClient from "./KIPlattformenClient";

export const metadata = buildListingMetadata({
  path: "/ki-plattformen",
  title: "KI-Plattformen — Übersicht, Vergleich und Hosting-Region",
  description:
    "Kuratierte Übersicht der wichtigsten KI-Plattformen für Text, Bild, Audio, Video und Code — mit Hosting-Region, Preis-Modell und direktem Vergleich.",
});

// Neu aufgebaut nach jedem Lauf des KI-Jobs und jeder Admin-Aenderung
// (revalidatePath), sonst stuendlich.
export const revalidate = 3600;

export default async function Page() {
  const { platforms, checkedAt } = await getPlatformDirectory();
  return <KIPlattformenClient platforms={platforms} checkedAt={checkedAt} />;
}
