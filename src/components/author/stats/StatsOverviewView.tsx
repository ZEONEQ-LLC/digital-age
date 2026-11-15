import Link from "next/link";

import StatsAuthorFilter from "@/components/author/stats/StatsAuthorFilter";
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
import type { StatsOverview } from "@/lib/stats/statsApi";
import { formatCount, formatDayCH, formatDuration, formatPercent, rangeLabel } from "@/lib/stats/summary";

// Uebersicht der Lesestatistik. Ohne Datenzugriff: Die Seite laedt
// (getStatsOverview) und reicht herein.

const BASE = "/autor/statistiken";

export default function StatsOverviewView({ data }: { data: StatsOverview }) {
  const { totals, lines, isEditor, authorId, authors, facts, range, window } = data;
  const filteredName = authorId ? authors.find((a) => a.id === authorId)?.name ?? null : null;
  const own = !isEditor;
  const per = window.bucket === "day" ? "Tag" : window.bucket === "week" ? "Woche" : "Monat";

  const hrefs: Record<string, string> = { "": statsHref(BASE, range, null) };
  for (const a of authors) hrefs[a.id] = statsHref(BASE, range, a.id);

  const factParts = [
    `${formatCount(facts.published)} ${facts.published === 1 ? "Beitrag" : "Beiträge"} veröffentlicht`,
    ...(facts.inProgress > 0 ? [`${formatCount(facts.inProgress)} in Arbeit`] : []),
    ...(facts.words > 0 ? [`${formatCount(facts.words)} Wörter`] : []),
  ];

  return (
    <div className="st">
      <StatsStyles />

      <header className="st-head">
        <h1 className="st-title">Statistiken</h1>
        <p className="st-sub">
          {own
            ? "Wie oft deine Beiträge geöffnet und gelesen werden."
            : filteredName
              ? `Wie oft die Beiträge von ${filteredName} geöffnet und gelesen werden.`
              : "Wie oft die Beiträge von digital age geöffnet und gelesen werden."}{" "}
          {factParts.join(" · ")}.
        </p>
      </header>

      <div className="st-controls">
        <RangeNav base={BASE} range={range} authorId={authorId} />
        {isEditor && authors.length > 1 && <StatsAuthorFilter authors={authors} value={authorId} hrefs={hrefs} />}
      </div>

      <Figures totals={totals} />

      <section className="st-section">
        <div className="st-h2row">
          <h2 className="st-h2">Aufrufe pro {per}</h2>
          <ChartLegend />
        </div>
        <StatsChart series={data.series} bucket={window.bucket} />
      </section>

      <section className="st-section">
        <div className="st-h2row">
          <h2 className="st-h2">Beiträge</h2>
          <span className="st-legend">{rangeLabel(range)}, meistgeöffnete zuerst</span>
        </div>
        {lines.length === 0 ? (
          <p className="st-note">Noch kein veröffentlichter Beitrag.</p>
        ) : (
          <table className="st-table">
            <thead>
              <tr>
                <th scope="col">Beitrag</th>
                <th scope="col">Aufrufe</th>
                <th scope="col" className="st-hide-s">Gelesen</th>
                <th scope="col">Lesequote</th>
                <th scope="col" className="st-hide-s">Lesezeit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const meta = [
                  l.published_at ? `veröffentlicht ${formatDayCH(l.published_at)}` : null,
                  isEditor && !authorId ? l.author_name : null,
                  l.content_type === "company" ? "Unternehmensbeitrag" : null,
                  l.status === "archived" ? "archiviert" : null,
                ].filter(Boolean);
                return (
                  <tr key={l.id} className={l.totals.views === 0 ? "st-table__zero" : undefined}>
                    <td>
                      <Link href={statsHref(`${BASE}/${l.id}`, range, null)} className="st-table__title" prefetch={false}>
                        {l.title}
                      </Link>
                      <div className="st-table__meta">{meta.join(" · ")}</div>
                    </td>
                    <td className={l.totals.views > 0 ? "st-table__strong" : undefined}>{formatCount(l.totals.views)}</td>
                    <td className="st-hide-s">{formatCount(Math.min(l.totals.reads, l.totals.views))}</td>
                    <td>{formatPercent(l.ratio)}</td>
                    <td className="st-hide-s">{formatDuration(l.avg)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {totals.views > 0 && (
        <div className="st-cols">
          <SourceSection totals={totals} />
          <DepthSection totals={totals} />
        </div>
      )}

      <ActionsLine totals={totals} />

      <CountingNote own={own} />
    </div>
  );
}
