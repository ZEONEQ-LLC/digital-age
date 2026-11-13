"use client";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import HubHero from "./HubHero";
import { usePathname, useSearchParams } from "next/navigation";
import ArticleListRow, { type ListArticle } from "./ArticleListRow";
import NewsletterSignup from "./NewsletterSignup";
import ModuleSlot, { type SlotReserve } from "./module/ModuleSlot";

type Accent = "green" | "orange" | "purple";

const accentVar: Record<Accent, string> = {
  green: "var(--da-green)",
  orange: "var(--da-orange)",
  purple: "var(--da-purple)",
};

type AuthorSpotlight = {
  name: string;
  // Author-Slug für ?author=<slug>-Filter. Sortierung + Anzeige bleiben
  // gleich, der Slug wird nur für den Filter-Link gebraucht.
  slug: string;
  role?: string;
  avatar: string;
  count: number;
};

export type TopTagItem = {
  slug: string;
  name: string;
  count: number;
};

export type TopicListingProps = {
  topicLabel: string;
  // Ein Satz neben dem Namen im Kopf (HubHero, Variante «Kompaktzeile»).
  claim?: string;
  // Zwischen Kopf und Liste, z. B. die Spotlight-Section der Rubrik.
  intro?: ReactNode;
  articles: ListArticle[];
  subcategories: string[];
  categoryColors?: Record<string, string>;
  trendingTags: string[];
  authors: AuthorSpotlight[];
  topTags?: TopTagItem[];
  accentColor?: Accent;
  ressortSlug?: string;
  moduleReserve?: SlotReserve;
  // Artikel, die schon oben stehen (Spotlight): in «Alle» ohne Autor-Filter
  // nicht noch einmal in der Liste.
  pinnedIds?: string[];
};

const PAGE_SIZE = 10;
const PAGE_INCREMENT = 10;

export default function TopicListing({
  topicLabel,
  claim,
  intro,
  articles,
  subcategories,
  categoryColors = {},
  trendingTags,
  authors,
  topTags = [],
  accentColor = "green",
  ressortSlug,
  moduleReserve,
  pinnedIds = [],
}: TopicListingProps) {
  const accent = accentVar[accentColor];
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <style>{`

        .tl-grid {
          max-width: var(--max-content);
          margin: 0 auto;
          padding: var(--sp-12) var(--sp-8) 0;
          display: grid;
          gap: 52px;
          align-items: start;
        }
        .tl-grid--open { grid-template-columns: 260px 1fr; }
        .tl-grid--closed { grid-template-columns: 1fr; }

        .tl-aside {
          display: flex; flex-direction: column;
          gap: 28px;
        }
        .tl-aside__label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: var(--fs-caption);
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .tl-cat-btn {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%;
          background: none; border: none; cursor: pointer;
          padding: 10px 0;
          border-bottom: 1px solid var(--da-border);
          color: var(--da-text-strong);
          font-size: var(--fs-body);
          font-weight: 400;
          font-family: var(--da-font-body);
          text-align: left;
        }
        .tl-cat-btn--active { color: var(--da-text); font-weight: 700; }
        .tl-cat-btn__name { display: flex; align-items: center; gap: 10px; }
        .tl-cat-btn__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; opacity: 0.4; }
        .tl-cat-btn--active .tl-cat-btn__dot { opacity: 1; }
        .tl-cat-btn__count { font-family: var(--da-font-mono); font-size: var(--fs-meta); color: var(--da-faint); }
        .tl-cat-btn--active .tl-cat-btn__count { color: var(--accent); }

        .tl-tags { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
        .tl-tag {
          background: var(--da-card);
          color: var(--da-muted);
          border: 1px solid var(--da-border);
          font-size: var(--fs-meta);
          font-weight: 500;
          padding: 5px 12px;
          border-radius: 20px;
          cursor: pointer;
          transition: border-color var(--t-fast), color var(--t-fast);
        }
        .tl-tag:hover { border-color: var(--accent); color: var(--accent); }
        .tl-tag--link {
          display: inline-flex; align-items: center; gap: 6px;
          text-decoration: none;
        }
        .tl-tag__count {
          font-family: var(--da-font-mono);
          font-size: 10px;
          color: var(--da-faint);
        }
        .tl-tag--link:hover .tl-tag__count { color: var(--accent); }
        .tl-tag-all {
          display: inline-block;
          margin-top: 12px;
          color: var(--da-muted);
          font-size: var(--fs-meta);
          text-decoration: none;
          font-family: var(--da-font-body);
          transition: color var(--t-fast);
        }
        .tl-tag-all:hover { color: var(--accent); }

        .tl-author {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--da-border);
        }
        .tl-author--link {
          text-decoration: none;
          color: inherit;
          padding: 10px 8px;
          margin: 0 -8px;
          border-radius: 4px;
          transition: background-color 0.15s;
        }
        .tl-author--link:hover { background: rgba(255,255,255,0.04); }
        .tl-author--active {
          background: rgba(50,255,126,0.08);
          border-bottom-color: var(--da-green);
        }
        .tl-author-filter {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
          background: rgba(50,255,126,0.08);
          border: 1px solid var(--da-green);
          border-radius: 4px;
          padding: 10px 14px;
          margin-bottom: 16px;
          color: var(--da-text);
          font-size: 13px;
        }
        .tl-author-filter__clear {
          color: var(--da-green);
          text-decoration: none;
          font-weight: 600;
          font-size: 12px;
          font-family: var(--da-font-mono);
        }
        .tl-author-filter__clear:hover { text-decoration: underline; }
        .tl-author__avatar {
          position: relative;
          width: 36px; height: 36px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          border: 1.5px solid var(--da-border);
          display: flex; align-items: center; justify-content: center;
          background: var(--da-card);
        }
        .tl-author__initials {
          color: var(--da-muted);
          font-size: 14px;
          font-weight: 600;
          font-family: var(--da-font-display);
        }
        .tl-author__name {
          color: var(--da-text);
          font-size: var(--fs-body-sm);
          font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .tl-author__role { color: var(--da-muted); font-size: 11px; }
        .tl-author__count { color: var(--accent); font-size: 11px; font-family: var(--da-font-mono); flex-shrink: 0; }

        .tl-feed-head {
          display: flex; align-items: baseline; justify-content: space-between;
          padding-bottom: var(--sp-3); border-bottom: 1px solid var(--da-border);
          margin-bottom: 0;
          gap: var(--sp-4);
          flex-wrap: wrap;
        }
        .tl-feed-count { color: var(--da-muted); font-family: var(--da-font-mono); font-size: var(--fs-meta); white-space: nowrap; }
        .tl-feed-label {
          color: var(--da-text); font-family: var(--da-font-display); font-size: 20px; font-weight: 700; margin: 0;
        }
        .tl-loader { padding-top: var(--sp-8); padding-bottom: var(--sp-4); text-align: center; }
        .tl-progress { height: 3px; background: var(--da-card); border-radius: 2px; margin-bottom: 12px; overflow: hidden; }
        .tl-progress__fill { height: 100%; transition: width var(--t-slow); }
        .tl-progress--done { height: 3px; border-radius: 2px; margin-bottom: 12px; }
        .tl-loader__msg { color: var(--da-faint); font-family: var(--da-font-mono); font-size: var(--fs-meta); }
        .tl-loader__msg--done { color: var(--da-muted); }
        .tl-empty {
          padding: var(--sp-12) 0;
          text-align: center;
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: var(--fs-body-sm);
        }

        @media (max-width: 1024px) {
          .tl-grid--open { grid-template-columns: 1fr; gap: var(--sp-10); }
          .tl-aside { position: static; }
          .hh .tl-toggle { display: none; }
        }
        @media (max-width: 640px) {
          .tl-grid { padding: var(--sp-10) var(--gutter) 0; }
        }
      `}</style>

      <HubHero
        title={topicLabel}
        claim={claim}
        accent={accent}
        action={
          <button
            type="button"
            className="hh-btn tl-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-pressed={sidebarOpen}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="10" rx="1" />
            </svg>
            Sidebar {sidebarOpen ? "ausblenden" : "einblenden"}
          </button>
        }
      />

      {intro}
      {/* Nur dieser Teil liest useSearchParams (Autor-Filter). Die eigene
          Suspense-Grenze haelt den Kopf (HubHero: H1 und Lead) im statischen HTML
          (SEO N1: H1 fehlte im SSR, weil die Grenze um die ganze Liste lag). */}
      <Suspense fallback={null}>
        <TopicListingBody
          articles={articles}
          subcategories={subcategories}
          categoryColors={categoryColors}
          trendingTags={trendingTags}
          authors={authors}
          topTags={topTags}
          ressortSlug={ressortSlug}
          moduleReserve={moduleReserve}
          pinnedIds={pinnedIds}
          accent={accent}
          sidebarOpen={sidebarOpen}
        />
      </Suspense>
    </>
  );
}

type TopicListingBodyProps = Omit<TopicListingProps, "topicLabel" | "claim" | "intro" | "accentColor" | "categoryColors" | "topTags"> & {
  categoryColors: Record<string, string>;
  topTags: TopTagItem[];
  accent: string;
  sidebarOpen: boolean;
};

// Liste, Sidebar und Autor-Filter. Liest useSearchParams und liegt deshalb
// innerhalb einer Suspense-Grenze (siehe TopicListing).
function TopicListingBody({
  articles,
  subcategories,
  categoryColors,
  trendingTags,
  authors,
  topTags,
  ressortSlug,
  moduleReserve,
  pinnedIds = [],
  accent,
  sidebarOpen,
}: TopicListingBodyProps) {
  const [activeCat, setActiveCat] = useState<string>(subcategories[0] ?? "Alle");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Author-Filter via URL-Param `?author=<slug>`. Bewusst URL-state statt
  // React-state: Refresh, Browser-Back/-Forward und shareable Links
  // funktionieren so out-of-the-box. Server-Component-Topic-Page bleibt
  // generisch (lädt alle Artikel) — Filtern findet hier client-seitig
  // statt, weil die Liste klein genug ist (max ~50 Artikel pro Kategorie).
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const authorFilter = searchParams.get("author");
  const activeAuthor = authorFilter
    ? authors.find((a) => a.slug === authorFilter) ?? null
    : null;

  const hidePinned = activeCat === "Alle" && !authorFilter && pinnedIds.length > 0;
  const filtered = useMemo(() => {
    let out = activeCat === "Alle" ? articles : articles.filter((a) => a.category === activeCat);
    if (authorFilter) out = out.filter((a) => a.authorSlug === authorFilter);
    if (hidePinned) {
      const pinned = new Set(pinnedIds);
      out = out.filter((a) => !pinned.has(String(a.id)));
    }
    return out;
  }, [articles, activeCat, authorFilter, hidePinned, pinnedIds]);
  const shown = filtered.slice(0, visibleCount);
  const progress = filtered.length === 0 ? 100 : Math.min(100, Math.round((visibleCount / filtered.length) * 100));

  const handleCatChange = (cat: string) => {
    setActiveCat(cat);
    setVisibleCount(PAGE_SIZE);
  };

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleCount < filtered.length) {
          setVisibleCount((v) => Math.min(v + PAGE_INCREMENT, filtered.length));
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, filtered.length]);

  const dotColorFor = (cat: string): string => categoryColors[cat] ?? accent;

  return (
      <div
        className={`tl-grid ${sidebarOpen ? "tl-grid--open" : "tl-grid--closed"}`}
        style={{ ["--accent" as string]: accent }}
      >
        {sidebarOpen && (
          <aside className="tl-aside">
            <div>
              <p className="tl-aside__label">Kategorien</p>
              {subcategories.map((cat) => {
                const count = cat === "Alle" ? articles.length : articles.filter((a) => a.category === cat).length;
                const dot = categoryColors[cat];
                const active = cat === activeCat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCatChange(cat)}
                    className={`tl-cat-btn${active ? " tl-cat-btn--active" : ""}`}
                  >
                    <span className="tl-cat-btn__name">
                      {dot && <span className="tl-cat-btn__dot" style={{ background: dot }} />}
                      {cat}
                    </span>
                    <span className="tl-cat-btn__count">{count}</span>
                  </button>
                );
              })}
            </div>

            {ressortSlug && (
              <ModuleSlot code="hub_sidebar" ressortSlug={ressortSlug} reserve={moduleReserve} />
            )}

            {trendingTags.length > 0 && (
              <div>
                <p className="tl-aside__label">Trending</p>
                <div className="tl-tags">
                  {trendingTags.map((tag) => (
                    <span key={tag} className="tl-tag"># {tag}</span>
                  ))}
                </div>
              </div>
            )}

            {topTags.length > 0 && (
              <div>
                <p className="tl-aside__label">Top Themen</p>
                <div className="tl-tags">
                  {topTags.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={`/tag/${tag.slug}`}
                      className="tl-tag tl-tag--link"
                      aria-label={`Tag ${tag.name}, ${tag.count} Artikel`}
                    >
                      #{tag.name}
                      <span className="tl-tag__count">{tag.count}</span>
                    </Link>
                  ))}
                </div>
                <Link href="/tags" className="tl-tag-all">
                  Alle Themen →
                </Link>
              </div>
            )}

            <div>
              <p className="tl-aside__label">Autoren</p>
              {authors.map((a) => {
                const isActive = activeAuthor?.slug === a.slug;
                return (
                  <Link
                    key={a.slug}
                    href={isActive ? pathname : `${pathname}?author=${a.slug}`}
                    className={`tl-author tl-author--link${isActive ? " tl-author--active" : ""}`}
                    aria-pressed={isActive}
                    title={
                      isActive
                        ? "Filter entfernen"
                        : `Artikel von ${a.name} anzeigen`
                    }
                  >
                    <div className="tl-author__avatar">
                      {a.avatar ? (
                        <Image src={a.avatar} alt={a.name} fill sizes="36px" style={{ objectFit: "cover" }} unoptimized />
                      ) : (
                        <span className="tl-author__initials">{a.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="tl-author__name">{a.name}</div>
                      {a.role && <div className="tl-author__role">{a.role}</div>}
                    </div>
                    <span className="tl-author__count">{a.count}</span>
                  </Link>
                );
              })}
            </div>

            <NewsletterSignup variant="sidebar" />
          </aside>
        )}

        <div>
          {activeAuthor && (
            <div className="tl-author-filter">
              <span>
                Artikel von <strong>{activeAuthor.name}</strong>
              </span>
              <Link href={pathname} className="tl-author-filter__clear">
                Alle anzeigen ×
              </Link>
            </div>
          )}
          <div className="tl-feed-head">
            <p className="tl-feed-label">{hidePinned ? "Neueste" : activeCat === "Alle" ? "Alle Artikel" : activeCat}</p>
            <p className="tl-feed-count">{hidePinned ? `${filtered.length} weitere Artikel` : `${filtered.length} Artikel`}</p>
          </div>

          {shown.length === 0 ? (
            <p className="tl-empty">Keine Artikel in dieser Kategorie.</p>
          ) : (
            shown.map((a) => (
              <ArticleListRow key={a.id} article={a} dotColor={dotColorFor(a.category)} />
            ))
          )}

          <div ref={loaderRef} className="tl-loader">
            {visibleCount < filtered.length ? (
              <>
                <div className="tl-progress">
                  <div className="tl-progress__fill" style={{ background: accent, width: `${progress}%` }} />
                </div>
                <p className="tl-loader__msg">{shown.length} von {filtered.length} · Scrolle für mehr</p>
              </>
            ) : (
              filtered.length > 0 && (
                <>
                  <div className="tl-progress--done" style={{ background: accent }} />
                  <p className="tl-loader__msg tl-loader__msg--done">Alle {filtered.length} Artikel geladen</p>
                </>
              )
            )}
          </div>
        </div>
      </div>
  );
}
