import { notFound } from "next/navigation";

import StatsArticleView from "@/components/author/stats/StatsArticleView";
import { getArticleStats } from "@/lib/stats/statsApi";
import { parseRange } from "@/lib/stats/summary";

// Lesestatistik eines Beitrags. Fremde Beitraege: 404 (ausser Redaktion).

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ArticleStatisticsPage({ params, searchParams }: PageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const data = await getArticleStats(id, parseRange(sp.zeit));
  if (!data) notFound();
  return <StatsArticleView data={data} />;
}
