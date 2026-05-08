"use client";

import { useMemo } from "react";
import AuthorShell from "@/components/author/AuthorShell";
import AuthorCard from "@/components/author/AuthorCard";
import PageTitle from "@/components/author/PageTitle";
import Sparkline from "@/components/author/Sparkline";
import StatCell from "@/components/author/StatCell";
import { getDashboardStats, getMyArticles } from "@/lib/mockAuthorApi";

const HEATMAP = [
  [0.10, 0.05, 0.04, 0.03, 0.02, 0.05, 0.10, 0.20, 0.45, 0.55, 0.50, 0.40, 0.45, 0.55, 0.65, 0.60, 0.55, 0.45, 0.40, 0.35, 0.30, 0.25, 0.20, 0.15],
  [0.10, 0.05, 0.05, 0.03, 0.03, 0.06, 0.12, 0.25, 0.50, 0.60, 0.55, 0.45, 0.50, 0.60, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40, 0.30, 0.25, 0.20, 0.18],
  [0.12, 0.05, 0.04, 0.03, 0.02, 0.05, 0.10, 0.22, 0.48, 0.58, 0.50, 0.42, 0.48, 0.55, 0.62, 0.55, 0.50, 0.45, 0.40, 0.35, 0.30, 0.25, 0.18, 0.16],
  [0.10, 0.05, 0.04, 0.02, 0.02, 0.05, 0.10, 0.20, 0.45, 0.55, 0.50, 0.40, 0.45, 0.55, 0.60, 0.55, 0.50, 0.45, 0.40, 0.35, 0.28, 0.22, 0.16, 0.12],
  [0.08, 0.04, 0.03, 0.02, 0.02, 0.05, 0.10, 0.18, 0.42, 0.50, 0.45, 0.38, 0.42, 0.50, 0.55, 0.50, 0.45, 0.40, 0.36, 0.30, 0.24, 0.18, 0.14, 0.10],
  [0.04, 0.03, 0.02, 0.01, 0.01, 0.02, 0.05, 0.10, 0.18, 0.25, 0.30, 0.32, 0.35, 0.38, 0.40, 0.38, 0.35, 0.30, 0.26, 0.22, 0.18, 0.14, 0.10, 0.08],
  [0.03, 0.02, 0.01, 0.01, 0.01, 0.02, 0.04, 0.08, 0.15, 0.22, 0.26, 0.28, 0.32, 0.36, 0.40, 0.38, 0.35, 0.30, 0.25, 0.20, 0.15, 0.12, 0.08, 0.05],
];

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function StatisticsPage() {
  const stats = useMemo(() => getDashboardStats(), []);
  const articles = useMemo(() => getMyArticles(), []);
  const published = articles.filter((a) => a.status === "published");
  const totalViews = published.reduce((a, b) => a + b.views, 0);

  return (
    <AuthorShell>
      <PageTitle
        title="Statistiken"
        subtitle="Wie deine Artikel performen — letzte 30 Tage"
      />

      <style>{`
        .a-stats__hero { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .a-stats__cols { display: grid; grid-template-columns: 1fr 360px; gap: 20px; }
        .a-stats__table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .a-stats__table th {
          color: var(--da-muted-soft); font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 10px 0; font-family: var(--da-font-mono);
          border-bottom: 1px solid var(--da-border);
        }
        .a-stats__table td {
          padding: 14px 8px 14px 0; border-bottom: 1px solid var(--da-border);
          color: var(--da-muted);
        }
        .a-stats__table .right { text-align: right; font-family: var(--da-font-mono); }
        .a-stats__table .right.text { color: var(--da-text); }
        .a-stats__cell-title {
          color: var(--da-text); max-width: 260px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .a-stats__heat { display: flex; flex-direction: column; gap: 3px; }
        .a-stats__heat-row { display: flex; align-items: center; gap: 6px; }
        .a-stats__heat-label {
          color: var(--da-muted-soft); font-size: 10px; width: 18px;
          font-family: var(--da-font-mono);
        }
        .a-stats__heat-cells { display: flex; gap: 2px; flex: 1; }
        .a-stats__heat-cell { flex: 1; height: 12px; border-radius: 1px; }
        .a-stats__heat-axis {
          display: flex; justify-content: space-between;
          color: var(--da-muted-soft); font-size: 9px;
          margin-top: 8px; font-family: var(--da-font-mono);
          padding-left: 24px;
        }
        @media (max-width: 1024px) {
          .a-stats__hero { grid-template-columns: repeat(2, 1fr); }
          .a-stats__cols { grid-template-columns: 1fr; }
        }
        @media (max-width: 540px) {
          .a-stats__hero { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="a-stats__hero">
        <StatCell label="Views" value={`${(totalViews / 1000).toFixed(1)}K`} sub="↑ 18% vs. Vormonat" />
        <StatCell label="Unique Readers" value={`${(stats.unique30d / 1000).toFixed(1)}K`} sub="70% von Views" accent="var(--da-green)" />
        <StatCell label="Avg. Read Time" value={stats.avgReadTime} sub="↑ 12s" accent="var(--da-purple)" />
        <StatCell label="Newsletter-Subs" value={stats.newsletterSubs.toString()} sub="aus deinen Artikeln" accent="var(--da-orange)" />
      </div>

      <AuthorCard padding={24} style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ color: "var(--da-text)", fontSize: 16, fontWeight: 700, fontFamily: "var(--da-font-display)" }}>
            Views — letzte 30 Tage
          </h3>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { label: "7T", active: false },
              { label: "30T", active: true },
              { label: "90T", active: false },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                style={{
                  background: p.active ? "var(--da-text)" : "transparent",
                  color: p.active ? "var(--da-dark)" : "var(--da-muted-soft)",
                  border: `1px solid ${p.active ? "var(--da-text)" : "var(--da-border)"}`,
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <Sparkline data={stats.views30d} color="var(--da-green)" height={140} />
      </AuthorCard>

      <div className="a-stats__cols">
        <AuthorCard padding={24}>
          <h3 style={{ color: "var(--da-text)", fontSize: 16, fontWeight: 700, fontFamily: "var(--da-font-display)", marginBottom: 18 }}>
            Performance pro Artikel
          </h3>
          {published.length === 0 ? (
            <p style={{ color: "var(--da-muted)", fontSize: 13 }}>Noch nichts veröffentlicht.</p>
          ) : (
            <table className="a-stats__table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Artikel</th>
                  <th style={{ textAlign: "right" }}>Views</th>
                  <th style={{ textAlign: "right" }}>Reads</th>
                  <th style={{ textAlign: "right" }}>Completion</th>
                  <th style={{ textAlign: "right" }}>Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {published.map((a) => (
                  <tr key={a.id}>
                    <td className="a-stats__cell-title">{a.title}</td>
                    <td className="right text">{a.views.toLocaleString("de-CH")}</td>
                    <td className="right">{a.reads.toLocaleString("de-CH")}</td>
                    <td
                      className="right"
                      style={{
                        color: a.completion >= 75 ? "var(--da-green)" : "var(--da-text)",
                        fontWeight: 700,
                      }}
                    >
                      {a.completion}%
                    </td>
                    <td className="right">{a.avgTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AuthorCard>

        <AuthorCard padding={24}>
          <h3 style={{ color: "var(--da-text)", fontSize: 15, fontWeight: 700, fontFamily: "var(--da-font-display)", marginBottom: 6 }}>
            Aktivitäts-Heatmap
          </h3>
          <p style={{ color: "var(--da-muted-soft)", fontSize: 11, marginBottom: 16 }}>
            Wann deine Leser online sind
          </p>
          <div className="a-stats__heat">
            {HEATMAP.map((row, i) => (
              <div key={i} className="a-stats__heat-row">
                <span className="a-stats__heat-label">{DAYS[i]}</span>
                <div className="a-stats__heat-cells">
                  {row.map((v, j) => (
                    <div
                      key={j}
                      className="a-stats__heat-cell"
                      style={{ background: `rgba(50, 255, 126, ${v.toFixed(2)})` }}
                      title={`${j}h`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="a-stats__heat-axis">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </AuthorCard>
      </div>
    </AuthorShell>
  );
}
