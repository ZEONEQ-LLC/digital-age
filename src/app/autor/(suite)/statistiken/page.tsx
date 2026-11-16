import { redirect } from "next/navigation";

import StatsOverviewView from "@/components/author/stats/StatsOverviewView";
import { getStatsOverview } from "@/lib/stats/statsApi";
import { parseRange } from "@/lib/stats/summary";

// Lesestatistik: Aufrufe, Lesequote, Lesezeit, Herkunft und Lesetiefe.
// Autorinnen und Autoren sehen ihre Beitraege, die Redaktion alle (Filter
// ?autor=<id>). Zeitraum ?zeit=7|30|90|365|alle, Standard 30 Tage.
// Messung: src/lib/stats/reading.ts, Auswertung: src/lib/stats/summary.ts.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StatisticsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const data = await getStatsOverview({
    range: parseRange(sp.zeit),
    authorId: typeof sp.autor === "string" ? sp.autor : null,
  });
  if (!data) redirect("/login");
  return <StatsOverviewView data={data} />;
}
