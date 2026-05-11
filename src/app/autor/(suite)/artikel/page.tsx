"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import AuthorShell from "@/components/author/AuthorShell";
import AuthorStatusBadge from "@/components/author/AuthorStatusBadge";
import PageTitle from "@/components/author/PageTitle";
import { getMyArticles } from "@/lib/mockAuthorApi";
import type { ArticleStatus } from "@/types/author";

type FilterKey = "all" | ArticleStatus;

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: "all",        label: "Alle" },
  { id: "draft",      label: "Entwürfe" },
  { id: "in_review",  label: "In Review" },
  { id: "changes",    label: "Änderungen" },
  { id: "published",  label: "Veröffentlicht" },
];

export default function MyArticlesPage() {
  const articles = useMemo(() => getMyArticles(), []);
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = filter === "all" ? articles : articles.filter((a) => a.status === filter);

  return (
    <AuthorShell>
      <PageTitle
        title="Meine Artikel"
        subtitle={`${articles.length} Artikel insgesamt`}
        right={
          <Link
            href="/autor/artikel/neu"
            style={{
              background: "var(--da-green)",
              color: "var(--da-dark)",
              padding: "11px 18px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            + Neuer Artikel
          </Link>
        }
      />

      <style>{`
        .a-art__filters { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
        .a-art__filter {
          background: var(--da-card); color: var(--da-muted);
          border: 1px solid var(--da-border);
          border-radius: 999px; padding: 7px 13px;
          font-size: 12px; font-weight: 600;
          cursor: pointer; white-space: nowrap;
          font-family: inherit;
        }
        .a-art__filter:hover { color: var(--da-text); }
        .a-art__filter--active {
          background: var(--da-text); color: var(--da-dark);
          border-color: var(--da-text);
        }
        .a-art__filter-count {
          font-family: var(--da-font-mono); margin-left: 4px;
          color: var(--da-faint);
        }
        .a-art__filter--active .a-art__filter-count { color: var(--da-muted-soft); }
        .a-art__row {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr) 150px 130px 70px;
          gap: 16px; padding: 14px; align-items: center;
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: 8px; cursor: pointer; text-decoration: none;
          transition: border-color var(--t-fast);
          margin-bottom: 10px;
        }
        .a-art__row:hover { border-color: var(--da-green); }
        .a-art__cover { width: 72px; height: 56px; border-radius: 4px; object-fit: cover; display: block; }
        .a-art__title {
          color: var(--da-text); font-size: 15px; font-weight: 600;
          margin-bottom: 5px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .a-art__meta {
          display: flex; gap: 10px; font-size: 12px;
          color: var(--da-muted-soft); white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
        }
        .a-art__cat { color: var(--da-orange); font-weight: 600; }
        .a-art__time {
          font-size: 12px; color: var(--da-muted);
          font-family: var(--da-font-mono);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .a-art__arrow {
          color: var(--da-faint); font-size: 12px; text-align: right;
          font-weight: 600; white-space: nowrap;
        }
        @media (max-width: 1024px) {
          .a-art__row { grid-template-columns: 72px 1fr auto; }
          .a-art__row > :nth-child(4),
          .a-art__row > :nth-child(5) { display: none; }
        }
        @media (max-width: 540px) {
          .a-art__row { grid-template-columns: 56px 1fr; }
          .a-art__cover { width: 56px; height: 44px; }
          .a-art__row > :nth-child(3) { display: none; }
        }
      `}</style>

      <div className="a-art__filters">
        {FILTERS.map((t) => {
          const count = t.id === "all" ? articles.length : articles.filter((a) => a.status === t.id).length;
          const sel = t.id === filter;
          return (
            <button
              key={t.id}
              type="button"
              className={`a-art__filter${sel ? " a-art__filter--active" : ""}`}
              onClick={() => setFilter(t.id)}
            >
              {t.label}
              <span className="a-art__filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--da-muted)", fontSize: 13, padding: "32px 0" }}>
          Keine Artikel in dieser Ansicht.
        </p>
      ) : (
        filtered.map((a) => (
          <Link key={a.id} href={`/autor/artikel/${a.id}`} className="a-art__row">
            <Image
              src={a.cover}
              alt=""
              width={72}
              height={56}
              className="a-art__cover"
              unoptimized
            />
            <div style={{ minWidth: 0 }}>
              <h3 className="a-art__title">{a.title}</h3>
              <div className="a-art__meta">
                <span className="a-art__cat">{a.category}</span>
                <span>·</span>
                <span>{a.wordCount} Wörter · {a.readMinutes} min</span>
              </div>
            </div>
            <AuthorStatusBadge status={a.status} size="sm" />
            <div className="a-art__time">
              {a.status === "published"
                ? `${a.views.toLocaleString("de-CH")} views`
                : relativeFromIso(a.updatedAt)}
            </div>
            <span className="a-art__arrow">→</span>
          </Link>
        ))
      )}
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
