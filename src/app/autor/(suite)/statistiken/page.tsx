import AuthorCard from "@/components/author/AuthorCard";
import PageTitle from "@/components/author/PageTitle";
import StatCell from "@/components/author/StatCell";
import AuthorStatusBadge from "@/components/author/AuthorStatusBadge";
import { getDashboardStats, getMyArticles } from "@/lib/authorApi";

export default async function StatisticsPage() {
  const [stats, articles] = await Promise.all([
    getDashboardStats(),
    getMyArticles(),
  ]);

  const totalArticles = articles.length;
  const totalAuthors = new Set(
    articles.map((a) => a.author?.id).filter((x): x is string => !!x),
  ).size;

  return (
    <>
      <PageTitle
        title="Statistiken"
        subtitle="Was aus den Daten ablesbar ist — echte Analytics kommen mit Event-Tracking-Integration."
      />

      <style>{`
        .a-stats__hero { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
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
        .a-stats__cell-title {
          color: var(--da-text); max-width: 260px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .a-stats__note {
          background: var(--da-card);
          border: 1px dashed var(--da-border);
          border-radius: 8px;
          padding: 18px 22px;
          color: var(--da-muted);
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .a-stats__note strong { color: var(--da-text-strong); }
        @media (max-width: 1024px) {
          .a-stats__hero { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 540px) {
          .a-stats__hero { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="a-stats__hero">
        <StatCell label="Artikel total" value={totalArticles} />
        <StatCell label="Veröffentlicht" value={stats.publishedCount} accent="var(--da-green)" />
        <StatCell label="In Arbeit" value={stats.draftCount + stats.inReviewCount} accent="var(--da-orange)" />
        <StatCell label="Total Wörter" value={stats.totalWordCount.toLocaleString("de-CH")} sub={`${stats.totalReadingMinutes} min Lesezeit gesamt`} />
      </div>

      <div className="a-stats__note">
        <strong>Hinweis:</strong> Views, Read-Time und Completion-Raten erscheinen
        hier sobald Event-Tracking integriert ist (Phase 8, geplant mit Plausible
        oder Supabase-Events). Aktuell zeigen wir nur Zahlen, die wirklich aus
        der DB ablesbar sind — kein Mock-Stub.
      </div>

      <AuthorCard padding={24}>
        <h3 style={{ color: "var(--da-text)", fontSize: 16, fontWeight: 700, fontFamily: "var(--da-font-display)", marginBottom: 18 }}>
          Alle Artikel ({totalArticles}{totalAuthors > 1 ? ` · ${totalAuthors} Autoren` : ""})
        </h3>
        {articles.length === 0 ? (
          <p style={{ color: "var(--da-muted)", fontSize: 13 }}>Noch keine Artikel.</p>
        ) : (
          <table className="a-stats__table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Artikel</th>
                <th style={{ textAlign: "left" }}>Autor</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "right" }}>Wörter</th>
                <th style={{ textAlign: "right" }}>Lesezeit</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id}>
                  <td className="a-stats__cell-title">{a.title}</td>
                  <td>{a.author?.display_name ?? "—"}</td>
                  <td><AuthorStatusBadge status={a.status} size="sm" /></td>
                  <td className="right">{(a.word_count ?? 0).toLocaleString("de-CH")}</td>
                  <td className="right">{a.reading_minutes ?? 0} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AuthorCard>
    </>
  );
}
