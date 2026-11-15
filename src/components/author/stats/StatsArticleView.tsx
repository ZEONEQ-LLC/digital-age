import Link from "next/link";

import StatsChart from "@/components/author/stats/StatsChart";
import {
  ActionsLine,
  ChartLegend,
  CountingNote,
  DepthSection,
  Figures,
  RangeNav,
  SourceSection,
  statsHref,
} from "@/components/author/stats/StatsParts";
import StatsStyles from "@/components/author/stats/StatsStyles";
import { articlePath } from "@/lib/contentType";
import type { ArticleStats } from "@/lib/stats/statsApi";
import { formatDayCH } from "@/lib/stats/summary";

// Lesestatistik eines Beitrags. Ohne Datenzugriff (getArticleStats laedt).

const BASE = "/autor/statistiken";

export default function StatsArticleView({ data }: { data: ArticleStats }) {
  const { article, totals, range, window, isEditor } = data;
  const per = window.bucket === "day" ? "Tag" : window.bucket === "week" ? "Woche" : "Monat";
  const live = article.status === "published";
  const meta = [
    article.published_at ? `veröffentlicht ${formatDayCH(article.published_at)}` : "noch nicht veröffentlicht",
    isEditor ? article.author_name : null,
    article.content_type === "company" ? "Unternehmensbeitrag" : null,
    article.status === "archived" ? "archiviert" : null,
  ].filter(Boolean);

  return (
    <div className="st">
      <StatsStyles />

      <Link href={statsHref(BASE, range, null)} className="st-back" prefetch={false}>
        ← Alle Beiträge
      </Link>

      <header className="st-head">
        <h1 className="st-title st-title--article">{article.title}</h1>
        <p className="st-sub">
          {meta.join(" · ")}
          {live && (
            <>
              {" · "}
              <a href={articlePath(article)} target="_blank" rel="noopener noreferrer">
                Beitrag ansehen
              </a>
            </>
          )}
          {" · "}
          <Link href={`/autor/artikel/${article.id}`} prefetch={false}>
            Im Editor öffnen
          </Link>
        </p>
      </header>

      <div className="st-controls">
        <RangeNav base={`${BASE}/${article.id}`} range={range} />
      </div>

      <Figures totals={totals} single />

      <section className="st-section">
        <div className="st-h2row">
          <h2 className="st-h2">Aufrufe pro {per}</h2>
          <ChartLegend />
        </div>
        <StatsChart series={data.series} bucket={window.bucket} />
      </section>

      {totals.views > 0 && (
        <div className="st-cols">
          <DepthSection totals={totals} />
          <SourceSection totals={totals} />
        </div>
      )}

      <ActionsLine totals={totals} />

      <CountingNote own={!isEditor} />
    </div>
  );
}
