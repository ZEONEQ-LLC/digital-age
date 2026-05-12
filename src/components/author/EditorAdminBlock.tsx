import Image from "next/image";
import Link from "next/link";
import AuthorCard from "@/components/author/AuthorCard";
import MonoCaption from "@/components/author/MonoCaption";
import StatCell from "@/components/author/StatCell";
import type { EditorPerformanceStats } from "@/lib/editorAdminApi";

type Props = { stats: EditorPerformanceStats };

export default function EditorAdminBlock({ stats }: Props) {
  return (
    <>
      <style>{`
        .a-eab-section { margin-top: 40px; }
        .a-eab-header {
          display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
        }
        .a-eab-mark {
          color: var(--da-orange); font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase;
          border: 1px solid var(--da-orange);
          padding: 3px 8px; border-radius: 3px;
        }
        .a-eab-title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: 18px; font-weight: 700;
        }
        .a-eab-stats {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
        }
        .a-eab-cols { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; align-items: start; }
        .a-eab-row {
          display: grid; grid-template-columns: 36px 1fr auto;
          gap: 12px; padding: 10px 12px; border-radius: 6px;
          background: var(--da-dark); border: 1px solid var(--da-border);
          align-items: center; text-decoration: none;
          transition: border-color var(--t-fast);
        }
        .a-eab-row + .a-eab-row { margin-top: 8px; }
        .a-eab-row:hover { border-color: var(--da-orange); }
        .a-eab-row__avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; display: block; }
        .a-eab-row__avatar-fb {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--da-card); color: var(--da-muted);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600;
        }
        .a-eab-row__name { color: var(--da-text); font-size: 13px; font-weight: 600; }
        .a-eab-row__count { color: var(--da-muted); font-size: 12px; }
        @media (max-width: 1024px) {
          .a-eab-stats { grid-template-columns: repeat(2, 1fr); }
          .a-eab-cols { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="a-eab-section">
        <div className="a-eab-header">
          <span className="a-eab-mark">Admin</span>
          <span className="a-eab-title">Redaktions-Übersicht</span>
        </div>

        <div className="a-eab-stats">
          <StatCell label="Authors" value={stats.totalAuthors} sub={`${stats.activeAuthors} aktiv · ${stats.placeholderAuthors} Placeholder`} />
          <StatCell label="In Review" value={stats.inReviewCount} sub="Wartet auf Editor" accent="var(--da-orange)" />
          <StatCell label="Veröffentlicht" value={stats.publishedCount} sub={`${stats.totalArticles} Artikel total`} accent="var(--da-green)" />
          <StatCell label="Pending Invites" value={stats.pendingInviteCount} sub={`${stats.acceptedLast7d} angenommen (7T)`} />
        </div>

        <div className="a-eab-cols">
          <AuthorCard padding={20}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: "var(--da-text)", fontSize: 15, fontWeight: 700, fontFamily: "var(--da-font-display)" }}>
                Top Authors
              </h3>
              <Link href="/autor/admin/autoren" style={{ color: "var(--da-orange)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                Alle Autoren →
              </Link>
            </div>
            {stats.topAuthors.length === 0 ? (
              <p style={{ color: "var(--da-muted)", fontSize: 13 }}>Noch keine Authors mit Artikeln.</p>
            ) : (
              <div>
                {stats.topAuthors.map((a) => (
                  <Link key={a.id} href={`/autor/admin/autoren`} className="a-eab-row">
                    {a.avatar_url ? (
                      <Image src={a.avatar_url} alt="" width={36} height={36} className="a-eab-row__avatar" unoptimized />
                    ) : (
                      <div className="a-eab-row__avatar-fb">{a.display_name.charAt(0).toUpperCase()}</div>
                    )}
                    <span className="a-eab-row__name">{a.display_name}</span>
                    <span className="a-eab-row__count">{a.article_count}</span>
                  </Link>
                ))}
              </div>
            )}
          </AuthorCard>

          <AuthorCard padding={20} accent="var(--da-orange)">
            <MonoCaption color="var(--da-orange)">Einladungen</MonoCaption>
            <p style={{ color: "var(--da-text)", fontSize: 22, fontWeight: 700, fontFamily: "var(--da-font-display)", marginTop: 6 }}>
              {stats.pendingInviteCount}
            </p>
            <p style={{ color: "var(--da-muted)", fontSize: 13, lineHeight: 1.6 }}>
              offen · {stats.acceptedLast7d} angenommen in den letzten 7 Tagen
            </p>
            <Link
              href="/autor/admin/einladungen"
              style={{ display: "inline-block", marginTop: 14, color: "var(--da-orange)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
            >
              Zur Übersicht →
            </Link>
          </AuthorCard>
        </div>
      </section>
    </>
  );
}
