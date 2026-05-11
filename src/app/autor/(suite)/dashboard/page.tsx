"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import AuthorShell from "@/components/author/AuthorShell";
import AuthorCard from "@/components/author/AuthorCard";
import AuthorStatusBadge from "@/components/author/AuthorStatusBadge";
import MonoCaption from "@/components/author/MonoCaption";
import PageTitle from "@/components/author/PageTitle";
import Sparkline from "@/components/author/Sparkline";
import StatCell from "@/components/author/StatCell";
import { getCurrentAuthor, getMyArticles } from "@/lib/mockAuthorApi";

export default function AuthorDashboardPage() {
  const author = useMemo(() => getCurrentAuthor(), []);
  const articles = useMemo(() => getMyArticles(), []);

  const totalViews = articles.reduce((a, b) => a + b.views, 0);
  const totalReads = articles.reduce((a, b) => a + b.reads, 0);
  const published = articles.filter((a) => a.status === "published");
  const inFlight = articles.filter((a) => a.status !== "published");
  const avgCompletion = published.length
    ? Math.round(published.reduce((a, b) => a + b.completion, 0) / published.length)
    : 0;
  const top = [...published].sort((a, b) => b.views - a.views)[0];
  const readRate = totalViews > 0 ? Math.round((totalReads / totalViews) * 100) : 0;

  return (
    <AuthorShell>
      <PageTitle
        title={`Willkommen zurück, ${author.name.split(" ")[0]}`}
        subtitle="Hier ist, was bei deinen Artikeln läuft."
        right={
          <Link
            href="/autor/artikel/neu"
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
        <StatCell
          label="Total Views"
          value={totalViews.toLocaleString("de-CH")}
          sub="↑ 12% vs. letzten Monat"
        />
        <StatCell
          label="Reads (Completed)"
          value={totalReads.toLocaleString("de-CH")}
          sub={`${readRate}% Read-Rate`}
        />
        <StatCell
          label="Avg. Completion"
          value={`${avgCompletion}%`}
          sub="Wie weit Leser kommen"
          accent="var(--da-green)"
        />
        <StatCell
          label="Veröffentlicht"
          value={published.length}
          sub={`${inFlight.length} in Bearbeitung`}
          accent="var(--da-orange)"
        />
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
                  <Image
                    src={a.cover}
                    alt=""
                    width={60}
                    height={60}
                    className="a-dash-row__cover"
                    unoptimized
                  />
                  <div style={{ minWidth: 0 }}>
                    <p className="a-dash-row__title">{a.title}</p>
                    <div className="a-dash-row__meta">
                      <span>{a.wordCount} Wörter</span>
                      <span>·</span>
                      <span>{relativeFromIso(a.updatedAt)}</span>
                    </div>
                  </div>
                  <AuthorStatusBadge status={a.status} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </AuthorCard>

        <AuthorCard padding={24} accent="var(--da-green)">
          <MonoCaption color="var(--da-green)">Top Performer</MonoCaption>
          {top ? (
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
                {top.title}
              </h3>
              <Sparkline
                data={[120, 180, 240, 410, 380, 520, 690, 880, 720, 920, 1100, 1240]}
                color="var(--da-green)"
                height={50}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
                <div>
                  <div style={{ color: "var(--da-text)", fontSize: 22, fontWeight: 700, fontFamily: "var(--da-font-display)", lineHeight: 1 }}>
                    {top.views.toLocaleString("de-CH")}
                  </div>
                  <div style={{ color: "var(--da-muted)", fontSize: 11, marginTop: 4 }}>Views</div>
                </div>
                <div>
                  <div style={{ color: "var(--da-green)", fontSize: 22, fontWeight: 700, fontFamily: "var(--da-font-display)", lineHeight: 1 }}>
                    {top.completion}%
                  </div>
                  <div style={{ color: "var(--da-muted)", fontSize: 11, marginTop: 4 }}>Completion</div>
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: "var(--da-muted)", fontSize: 13 }}>
              Noch kein veröffentlichter Artikel.
            </p>
          )}
        </AuthorCard>
      </div>
    </AuthorShell>
  );
}

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
