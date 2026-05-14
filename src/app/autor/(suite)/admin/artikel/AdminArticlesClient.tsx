"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import AuthorStatusBadge from "@/components/author/AuthorStatusBadge";
import type { ArticleStatus } from "@/lib/authorApi";

export type AdminArticleRow = {
  id: string;
  slug: string;
  title: string;
  status: ArticleStatus;
  coverImageUrl: string | null;
  publishedAt: string | null;
  readingMinutes: number | null;
  wordCount: number | null;
  authorId: string;
  authorName: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  tags: string[];
  isFeatured: boolean;
  isHero: boolean;
};

type StatusFilter = "all" | ArticleStatus;
type SortOrder = "date_desc" | "date_asc";
type FeaturedFilter = "all" | "featured" | "hero" | "not_featured";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "draft", label: "Entwürfe" },
  { id: "in_review", label: "In Review" },
  { id: "published", label: "Veröffentlicht" },
  { id: "archived", label: "Archiv" },
];

function relativeFromIso(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.max(1, Math.round((now - then) / 60000));
  if (diffMin < 60) return `vor ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 14) return `vor ${diffD} Tag${diffD === 1 ? "" : "en"}`;
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Props = {
  rows: AdminArticleRow[];
  authors: { id: string; display_name: string }[];
  categories: { id: string; name: string }[];
};

export default function AdminArticlesClient({ rows, authors, categories }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("date_desc");

  const filtered = useMemo(() => {
    let out = rows;
    if (statusFilter !== "all") out = out.filter((r) => r.status === statusFilter);
    if (authorFilter !== "all") out = out.filter((r) => r.authorId === authorFilter);
    if (categoryFilter !== "all") out = out.filter((r) => r.categoryId === categoryFilter);
    if (featuredFilter === "featured") out = out.filter((r) => r.isFeatured);
    else if (featuredFilter === "hero") out = out.filter((r) => r.isHero);
    else if (featuredFilter === "not_featured") out = out.filter((r) => !r.isFeatured);
    out = [...out].sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return sortOrder === "date_desc" ? tb - ta : ta - tb;
    });
    return out;
  }, [rows, statusFilter, authorFilter, categoryFilter, featuredFilter, sortOrder]);

  const counts = useMemo(() => {
    const c = { all: rows.length, draft: 0, in_review: 0, published: 0, archived: 0 };
    for (const r of rows) c[r.status as keyof typeof c]++;
    return c;
  }, [rows]);

  const filtersActive =
    authorFilter !== "all" ||
    categoryFilter !== "all" ||
    featuredFilter !== "all" ||
    sortOrder !== "date_desc";

  return (
    <>
      <style>{`
        .adm-art__filters { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
        .adm-art__filter {
          background: var(--da-card); color: var(--da-muted);
          border: 1px solid var(--da-border);
          border-radius: 999px; padding: 7px 13px;
          font-size: 12px; font-weight: 600;
          cursor: pointer; white-space: nowrap;
          font-family: inherit;
        }
        .adm-art__filter:hover { color: var(--da-text); }
        .adm-art__filter--active {
          background: var(--da-text); color: var(--da-dark);
          border-color: var(--da-text);
        }
        .adm-art__filter-count {
          font-family: var(--da-font-mono); margin-left: 4px;
          color: var(--da-faint);
        }
        .adm-art__filter--active .adm-art__filter-count { color: var(--da-muted-soft); }

        .adm-art__bar {
          display: flex; gap: 10px; flex-wrap: wrap;
          align-items: center;
          margin-bottom: 20px;
          padding: 12px 14px;
          background: var(--da-darker);
          border: 1px solid var(--da-border);
          border-radius: 8px;
        }
        .adm-art__select {
          background: var(--da-card);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 7px 10px;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
        }
        .adm-art__reset {
          background: transparent; color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 11px;
          cursor: pointer;
          font-family: inherit;
        }
        .adm-art__reset:hover { color: var(--da-text); }

        .adm-art__row {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr) 140px 140px 110px 70px;
          gap: 16px; padding: 14px; align-items: center;
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: 8px; cursor: pointer; text-decoration: none;
          transition: border-color var(--t-fast);
          margin-bottom: 10px;
        }
        .adm-art__row:hover { border-color: var(--da-green); }
        .adm-art__cover { width: 72px; height: 56px; border-radius: 4px; object-fit: cover; display: block; }
        .adm-art__cover-fb {
          width: 72px; height: 56px; border-radius: 4px;
          background: var(--da-dark);
        }
        .adm-art__title {
          color: var(--da-text); font-size: 15px; font-weight: 600;
          margin-bottom: 5px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .adm-art__meta {
          display: flex; gap: 10px; font-size: 12px;
          color: var(--da-muted-soft); white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
        }
        .adm-art__cat { color: var(--da-orange); font-weight: 600; }
        .adm-art__author {
          color: var(--da-text); font-size: 13px; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .adm-art__time {
          font-size: 12px; color: var(--da-muted);
          font-family: var(--da-font-mono);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .adm-art__arrow {
          color: var(--da-faint); font-size: 12px; text-align: right;
          font-weight: 600; white-space: nowrap;
        }
        .adm-art__empty {
          padding: 32px; text-align: center; color: var(--da-muted);
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: 8px;
        }
        @media (max-width: 1100px) {
          .adm-art__row { grid-template-columns: 72px 1fr 130px auto; }
          .adm-art__row > :nth-child(4),
          .adm-art__row > :nth-child(5) { display: none; }
        }
        @media (max-width: 600px) {
          .adm-art__row { grid-template-columns: 56px 1fr; }
          .adm-art__cover, .adm-art__cover-fb { width: 56px; height: 44px; }
          .adm-art__row > :nth-child(3),
          .adm-art__row > :nth-child(4),
          .adm-art__row > :nth-child(5),
          .adm-art__row > :nth-child(6) { display: none; }
        }
      `}</style>

      <div className="adm-art__filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={`adm-art__filter${statusFilter === f.id ? " adm-art__filter--active" : ""}`}
          >
            {f.label}
            <span className="adm-art__filter-count">
              {f.id === "all" ? counts.all : counts[f.id as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      <div className="adm-art__bar">
        <select
          className="adm-art__select"
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
        >
          <option value="all">Alle Authors</option>
          {authors.map((a) => (
            <option key={a.id} value={a.id}>{a.display_name}</option>
          ))}
        </select>
        <select
          className="adm-art__select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Alle Kategorien</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="adm-art__select"
          value={featuredFilter}
          onChange={(e) => setFeaturedFilter(e.target.value as FeaturedFilter)}
        >
          <option value="all">Featured: Alle</option>
          <option value="featured">Nur Featured</option>
          <option value="hero">Nur Hero</option>
          <option value="not_featured">Nicht featured</option>
        </select>
        <select
          className="adm-art__select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
        >
          <option value="date_desc">Datum: neueste zuerst</option>
          <option value="date_asc">Datum: älteste zuerst</option>
        </select>
        {filtersActive && (
          <button
            type="button"
            className="adm-art__reset"
            onClick={() => {
              setAuthorFilter("all");
              setCategoryFilter("all");
              setFeaturedFilter("all");
              setSortOrder("date_desc");
            }}
          >
            Filter zurücksetzen
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ color: "var(--da-muted)", fontSize: 12, fontFamily: "var(--da-font-mono)" }}>
          {filtered.length} {filtered.length === 1 ? "Treffer" : "Treffer"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="adm-art__empty">Keine Artikel mit diesen Filtern.</div>
      ) : (
        filtered.map((a) => (
          <Link
            key={a.id}
            href={`/autor/artikel/${a.id}`}
            className="adm-art__row"
          >
            {a.coverImageUrl ? (
              <Image
                src={a.coverImageUrl}
                alt=""
                width={72}
                height={56}
                className="adm-art__cover"
                unoptimized
              />
            ) : (
              <div className="adm-art__cover-fb" />
            )}
            <div style={{ minWidth: 0 }}>
              <div className="adm-art__title">{a.title}</div>
              <div className="adm-art__meta">
                <span className="adm-art__cat">{a.categoryName || a.categorySlug}</span>
                <span>{a.wordCount ?? 0} Wörter · {a.readingMinutes ?? 0} min</span>
              </div>
            </div>
            <div className="adm-art__author">{a.authorName}</div>
            <div className="adm-art__time">{relativeFromIso(a.publishedAt)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
              <AuthorStatusBadge status={a.status} />
              {a.isHero ? (
                <span
                  style={{
                    background: "var(--da-orange)",
                    color: "var(--da-dark)",
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    padding: "2px 6px",
                    borderRadius: 3,
                    fontFamily: "var(--da-font-mono)",
                    textTransform: "uppercase",
                  }}
                >
                  HERO
                </span>
              ) : a.isFeatured ? (
                <span
                  style={{
                    background: "transparent",
                    border: "1px solid var(--da-orange)",
                    color: "var(--da-orange)",
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontFamily: "var(--da-font-mono)",
                    textTransform: "uppercase",
                  }}
                >
                  FEATURED
                </span>
              ) : null}
            </div>
            <div className="adm-art__arrow">→</div>
          </Link>
        ))
      )}
    </>
  );
}
