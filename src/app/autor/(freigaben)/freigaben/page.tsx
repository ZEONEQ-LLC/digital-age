import PageTitle from "@/components/author/PageTitle";
import { getPendingApprovals } from "@/lib/podcasts/approvalsApi";
import FreigabenClient from "./FreigabenClient";

// Freigaben: fuers iPhone gebaut, nur lesen und entscheiden. Editor-Gate ueber
// (freigaben)/layout.tsx, Shell mit mobile="allow". Version 1 nur Podcast-Empfehlungen aus dem Ingest;
// die Karte ist generisch genug fuer weitere Quellen.
export const dynamic = "force-dynamic";

export default async function FreigabenPage() {
  const items = await getPendingApprovals();
  return (
    <>
      <PageTitle
        title="Freigaben"
        subtitle="Empfehlungen aus dem Kurzbefehl: kurz lesen, dann veröffentlichen oder verwerfen."
      />
      <FreigabenClient items={items} />
    </>
  );
}
