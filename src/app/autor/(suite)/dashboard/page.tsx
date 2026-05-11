import Image from "next/image";
import Link from "next/link";
import AuthorCard from "@/components/author/AuthorCard";
import AuthorStatusBadge from "@/components/author/AuthorStatusBadge";
import MonoCaption from "@/components/author/MonoCaption";
import PageTitle from "@/components/author/PageTitle";
import StatCell from "@/components/author/StatCell";
import {
  getCurrentAuthor,
  getDashboardStats,
  getMyArticles,
} from "@/lib/authorApi";

function relativeFromIso(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.max(1, Math.round((now - then) / 60000));
  if (diffMin < 60) return `vor ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 14) return `vor ${diffD} Tag${diffD === 1 ? "" : "en"}`;
  const diffW = Math.round(diffD / 7);
  return `vor ${diffW} Wo.`;
}

export default async function AuthorDashboardPage() {
  const [author, stats, all] = await Promise.all([
    getCurrentAuthor(),
    getDashboardStats(),
    getMyArticles(),
  ]);

  const firstName = author?.display_name?.split(" ")[0] ?? "Autor:in";
  const published = all.filter((a) => a.status === "published");
  const inFlight = all.filter((a) => a.status !== "published" && a.status !== "archived");
  const topPublished = published[0] ?? null;

  return (
    <>
      <PageTitle
        title={`Willkommen zurück, ${firstName}`}
        subtitle="Hier ist, was bei deinen Artikeln läuft."
        right={
          <Link
            href="/autor/artikel/neu"
            prefetch={false}
            style={{
              background: "var(--da-green)",
              color: "var(--da-dark)",
              border: "none",
              padding: "11px 18px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            + Neuer Artikel
          </Link>
        }
      />

      <style>{`
        .a-dash-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
        .a-dash-cols { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; align-items: start; }
        .a-dash-row {
          display: grid; grid-template-columns: 60px 1fr auto;
          gap: 14px; padding: 12px; border-radius: 6px;
          background: var(--da-dark); border: 1px solid var(--da-border);
          align-items: center; cursor: pointer; text-decoration: none;
          transition: border-color var(--t-fast);
        }
        .a-dash-row:hover { border-color: var(--da-green); }
        .a-dash-row__cover {
          width: 60px; height: 60px; border-radius: 4px; object-fit: cover; display: block;
        }
        .a-dash-row__cover-fallback {
          width: 60px; height: 60px; border-radius: 4px;
          background: var(--da-card);
        }
        .a-dash-row__title {
          color: var(--da-text); font-size: 13px; font-weight: 600; margin-bottom: 4px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .a-dash-row__meta { display: flex; gap: 10px; font-size: 11px; color: var(--da-muted-soft); }
        @media (max-width: 1024px) {
          .a-dash-stats { grid-template-columns: repeat(2, 1fr); }
          .a-dash-cols { grid-template-columns: 1fr; }
        }
        @media (max-width: 540px) {
          .a-dash-stats { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="a-dash-stats">
        <StatCell label="Drafts" value={stats.draftCount} sub="Noch nicht eingereicht" />
        <StatCell label="In Review" value={stats.inReviewCount} sub="Wartet auf Editor" accent="var(--da-orange)" />
        <StatCell label="Veröffentlicht" value={stats.publishedCount} sub="Live auf der Seite" accent="var(--da-green)" />
        <StatCell label="Total Wörter" value={stats.totalWordCount.toLocaleString("de-CH")} sub={`${stats.totalReadingMinutes} min Lesezeit gesamt`} />
      </div>

      <div className="a-dash-cols">
        <AuthorCard padding={24}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ color: "var(--da-text)", fontSize: 16, fontWeight: 700, fontFamily: "var(--da-font-display)" }}>In Arbeit</h3>
            <span style={{ color: "var(--da-muted)", fontSize: 12 }}>{inFlight.length} Artikel</span>
          </div>
          {inFlight.length === 0 ? (
            <p style={{ color: "var(--da-muted)", fontSize: 13 }}>Alles veröffentlicht. Zeit für den nächsten Pitch?</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inFlight.map((a) => (
                <Link key={a.id} href={`/autor/artikel/${a.id}`} className="a-dash-row">
                  {a.cover_image_url ? (
                    <Image
                      src={a.cover_image_url}
                      alt=""
                      width={60}
                      height={60}
                      className="a-dash-row__cover"
                      unoptimized
                    />
                  ) : (
                    <div className="a-dash-row__cover-fallback" />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p className="a-dash-row__title">{a.title}</p>
                    <div className="a-dash-row__meta">
                      <span>{a.word_count ?? 0} Wörter</span>
                      <span>·</span>
                      <span>{relativeFromIso(a.updated_at)}</span>
                    </div>
                  </div>
                  <AuthorStatusBadge status={a.status} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </AuthorCard>

        <AuthorCard padding={24} accent="var(--da-green)">
          <MonoCaption color="var(--da-green)">Letzter Beitrag</MonoCaption>
          {topPublished ? (
            <>
              <h3
                style={{
                  color: "var(--da-text)",
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: "var(--da-font-display)",
                  lineHeight: 1.3,
                  marginBottom: 16,
                }}
              >
                {topPublished.title}
              </h3>
              <p style={{ color: "var(--da-muted)", fontSize: 13, lineHeight: 1.6 }}>
                {topPublished.word_count ?? 0} Wörter · {topPublished.reading_minutes ?? 0} min Lesezeit
              </p>
              <Link
                href={`/autor/artikel/${topPublished.id}`}
                style={{
                  display: "inline-block",
                  marginTop: 14,
                  color: "var(--da-green)",
                  fontSize: 13,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Bearbeiten →
              </Link>
            </>
          ) : (
            <p style={{ color: "var(--da-muted)", fontSize: 13 }}>
              Noch kein veröffentlichter Artikel.
            </p>
          )}
        </AuthorCard>
      </div>
    </>
  );
}
