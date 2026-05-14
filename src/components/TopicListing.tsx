"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ArticleListRow, { type ListArticle } from "./ArticleListRow";

type Accent = "green" | "orange" | "purple";

const accentVar: Record<Accent, string> = {
  green: "var(--da-green)",
  orange: "var(--da-orange)",
  purple: "var(--da-purple)",
};

type AuthorSpotlight = {
  name: string;
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
  lead: string;
  articles: ListArticle[];
  subcategories: string[];
  categoryColors?: Record<string, string>;
  trendingTags: string[];
  authors: AuthorSpotlight[];
  topTags?: TopTagItem[];
  newsletter: { title: string; rhythm: string };
  accentColor?: Accent;
};

const PAGE_SIZE = 6;
const PAGE_INCREMENT = 3;

export default function TopicListing({
  topicLabel,
  lead,
  articles,
  subcategories,
  categoryColors = {},
  trendingTags,
  authors,
  topTags = [],
  newsletter,
  accentColor = "green",
}: TopicListingProps) {
  const accent = accentVar[accentColor];
  const [activeCat, setActiveCat] = useState<string>(subcategories[0] ?? "Alle");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(
    () => (activeCat === "Alle" ? articles : articles.filter((a) => a.category === activeCat)),
    [articles, activeCat]
  );
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
    <>
      <style>{`
        .tl-header { position: relative; border-bottom: 1px solid var(--da-border); overflow: hidden; }
        .tl-header__bg { position: absolute; inset: 0; display: flex; opacity: 0.06; pointer-events: none; }
        .tl-header__bg-cell { flex: 1; position: relative; }
        .tl-header__bg-cell > img { object-fit: cover; }
        .tl-header__overlay {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(to right, var(--da-dark) 0%, rgba(28,28,30,0.85) 50%, var(--da-dark) 100%);
        }
        .tl-header__inner { position: relative; max-width: var(--max-content); margin: 0 auto; padding: 48px var(--sp-8) 44px; }
        .tl-breadcrumb { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-5); flex-wrap: wrap; }
        .tl-breadcrumb a, .tl-breadcrumb span { font-size: var(--fs-meta); }
        .tl-breadcrumb__home { color: var(--da-muted); }
        .tl-breadcrumb__sep { color: var(--da-faint); }
        .tl-breadcrumb__topic { font-weight: 600; }
        .tl-breadcrumb__count { color: var(--da-muted-soft); font-family: var(--da-font-mono); white-space: nowrap; }
        .tl-header__row {
          display: flex; align-items: flex-end; justify-content: space-between;
          flex-wrap: wrap; gap: var(--sp-5);
        }
        .tl-header__title-block { display: flex; align-items: center; gap: var(--sp-4); }
        .tl-header__bar { width: 4px; height: 56px; border-radius: 2px; flex-shrink: 0; }
        .tl-header__h1 {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: clamp(32px, 4vw, 48px);
          font-weight: 700;
          line-height: 1.0;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .tl-header__lead { color: var(--da-muted); font-size: 15px; line-height: 1.6; max-width: 500px; margin-top: 10px; }
        .tl-toggle {
          border-radius: var(--r-md);
          padding: 8px 16px;
          font-size: var(--fs-meta);
          font-weight: 600;
          font-family: var(--da-font-body);
          display: inline-flex; align-items: center; gap: 6px;
          cursor: pointer;
          transition: background-color var(--t-base), color var(--t-base), border-color var(--t-base);
        }
        .tl-toggle--off {
          background: var(--da-card);
          color: var(--da-muted);
          border: 1px solid var(--da-border);
        }
        .tl-toggle--off:hover { color: var(--da-text); }

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
          position: sticky;
          top: calc(var(--nav-h) + var(--sp-5));
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

        .tl-newsletter {
          background: var(--da-card);
          border: 1px solid var(--accent);
          border-radius: var(--r-lg);
          padding: 20px;
        }
        .tl-newsletter__overline {
          color: var(--accent);
          font-family: var(--da-font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .tl-newsletter__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: var(--fs-body);
          font-weight: 700;
          line-height: 1.4;
          margin-bottom: 6px;
        }
        .tl-newsletter__sub { color: var(--da-muted); font-size: var(--fs-meta); line-height: 1.5; margin-bottom: 16px; }
        .tl-newsletter__input {
          width: 100%;
          background: var(--da-dark);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: var(--r-sm);
          padding: 9px 12px;
          font-size: var(--fs-body-sm);
          font-family: var(--da-font-body);
          margin-bottom: 8px;
        }
        .tl-newsletter__btn {
          width: 100%;
          background: var(--accent);
          color: var(--da-dark);
          border: none;
          padding: 10px;
          border-radius: var(--r-sm);
          font-size: var(--fs-body-sm);
          font-weight: 700;
          cursor: pointer;
          transition: filter var(--t-fast);
        }
        .tl-newsletter__btn:hover { filter: brightness(1.08); }

        .tl-feed-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: var(--sp-4);
          gap: var(--sp-4);
          flex-wrap: wrap;
        }
        .tl-feed-count { color: var(--da-muted); font-family: var(--da-font-mono); font-size: var(--fs-meta); white-space: nowrap; }
        .tl-feed-sort {
          background: var(--da-card);
          color: var(--da-text-strong);
          border: 1px solid var(--da-border);
          border-radius: var(--r-sm);
          padding: 6px 12px;
          font-size: var(--fs-meta);
          font-family: var(--da-font-body);
          cursor: pointer;
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
          .tl-toggle { display: none; }
        }
        @media (max-width: 640px) {
          .tl-grid { padding: var(--sp-10) var(--sp-5) 0; }
          .tl-header__inner { padding: var(--sp-10) var(--sp-5) var(--sp-8); }
          .tl-header__row { align-items: flex-start; }
        }
      `}</style>

      <section className="tl-header">
        <div className="tl-header__bg" aria-hidden>
          {articles.slice(0, 5).map((a, i) => (
            <div key={i} className="tl-header__bg-cell">
              <Image src={a.image} alt="" fill sizes="20vw" style={{ objectFit: "cover" }} />
            </div>
          ))}
        </div>
        <div className="tl-header__overlay" aria-hidden />
        <div className="tl-header__inner">
          <nav aria-label="Breadcrumb" className="tl-breadcrumb">
            <Link href="/" className="tl-breadcrumb__home">Home</Link>
            <span className="tl-breadcrumb__sep">/</span>
            <span className="tl-breadcrumb__topic" style={{ color: accent }}>{topicLabel}</span>
            <span className="tl-breadcrumb__sep">·</span>
            <span className="tl-breadcrumb__count">{articles.length} Artikel</span>
          </nav>
          <div className="tl-header__row">
            <div className="tl-header__title-block">
              <div className="tl-header__bar" style={{ background: accent }} />
              <div>
                <h1 className="tl-header__h1">{topicLabel}</h1>
                <p className="tl-header__lead">{lead}</p>
              </div>
            </div>
            <button
              type="button"
              className={`tl-toggle ${sidebarOpen ? "" : "tl-toggle--off"}`}
              style={
                sidebarOpen
                  ? { background: accent, color: "var(--da-dark)", border: `1px solid ${accent}` }
                  : undefined
              }
              onClick={() => setSidebarOpen((v) => !v)}
              aria-pressed={sidebarOpen}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="10" rx="1" />
              </svg>
              Sidebar {sidebarOpen ? "ausblenden" : "einblenden"}
            </button>
          </div>
        </div>
      </section>

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
              {authors.map((a) => (
                <div key={a.name} className="tl-author">
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
                </div>
              ))}
            </div>

            <div className="tl-newsletter">
              <p className="tl-newsletter__overline">Newsletter</p>
              <p className="tl-newsletter__title">{newsletter.title}</p>
              <p className="tl-newsletter__sub">{newsletter.rhythm}</p>
              <input type="email" placeholder="deine@email.ch" className="tl-newsletter__input" />
              <button type="button" className="tl-newsletter__btn">Abonnieren →</button>
            </div>
          </aside>
        )}

        <div>
          <div className="tl-feed-head">
            <p className="tl-feed-count">{filtered.length} Artikel</p>
            <select className="tl-feed-sort" defaultValue="neu" aria-label="Sortierung">
              <option value="neu">Neueste zuerst</option>
              <option value="meist">Meistgelesen</option>
            </select>
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
    </>
  );
}
