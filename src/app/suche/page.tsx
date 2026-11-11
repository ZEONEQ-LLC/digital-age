import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import ExternalBadge from "@/components/ExternalBadge";
import Footer from "@/components/Footer";
import { articleToListRow } from "@/lib/mappers/articleMappers";
import { searchArticles, SEARCH_LIMIT } from "@/lib/search/articles";
import { normalizeQuery, snippetParts } from "@/lib/search/snippet";

// Volltextsuche (/suche?q=…), Postgres-FTS ueber publizierte Artikel.
// Ergebnisseiten gehoeren nicht in den Index: noindex, follow.

export const metadata: Metadata = {
  title: "Suche",
  description: "Volltextsuche in allen Artikeln von digital-age.",
  alternates: { canonical: "/suche" },
  robots: { index: false, follow: true },
};

type SearchParams = Promise<{ q?: string | string[] }>;

const EXAMPLES = ["AI Act", "Banken", "Agenten", "Schweiz"];

function accentFor(categorySlug: string | undefined): string {
  return categorySlug === "future-tech" ? "var(--da-purple)" : "var(--da-green)";
}

export default async function SuchePage({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).q;
  const query = normalizeQuery(Array.isArray(raw) ? raw[0] : raw);
  const { hits, failed } = await searchArticles(query);

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <style>{`
        .sr-hero { border-bottom: 1px solid var(--da-border); padding: 48px var(--sp-8) 40px; }
        .sr-inner { max-width: var(--max-content); margin: 0 auto; }
        .sr-h1 {
          color: var(--da-text); font-family: var(--da-font-display); font-size: clamp(32px, 4vw, 48px);
          font-weight: 700; line-height: 1.0; letter-spacing: -0.02em; margin: 0 0 20px;
        }
        .sr-form { display: flex; gap: 10px; max-width: 680px; }
        .sr-input {
          flex: 1; min-width: 0; background: var(--da-card); color: var(--da-text); border: 1px solid var(--da-border);
          border-radius: 6px; padding: 14px 16px; font-size: 16px; font-family: inherit;
        }
        .sr-input:focus { outline: none; border-color: var(--da-green); }
        .sr-btn {
          background: var(--da-green); color: var(--da-dark); border: none; border-radius: 6px; padding: 0 22px;
          font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap;
        }
        .sr-hint { color: var(--da-muted-soft); font-size: 13px; line-height: 1.6; margin-top: 12px; max-width: 680px; }
        .sr-hint code { font-family: var(--da-font-mono); font-size: 12px; color: var(--da-muted); }
        .sr-results { padding: var(--sp-10) var(--sp-8) var(--sp-20); }
        .sr-count { color: var(--da-muted); font-family: var(--da-font-mono); font-size: var(--fs-meta); margin: 0 0 var(--sp-4); }
        .sr-item { display: flex; gap: var(--sp-5); padding: var(--sp-5) 0; border-bottom: 1px solid var(--da-border); text-decoration: none; }
        .sr-item:hover .sr-title { color: var(--da-green); }
        .sr-cover { position: relative; width: 156px; height: 104px; flex-shrink: 0; border-radius: var(--r-md); overflow: hidden; }
        .sr-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
        .sr-head { display: flex; align-items: center; gap: var(--sp-2); flex-wrap: wrap; }
        .sr-cat { font-family: var(--da-font-mono); font-size: var(--fs-overline); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
        .sr-meta { color: var(--da-faint); font-family: var(--da-font-mono); font-size: var(--fs-meta); display: flex; gap: var(--sp-2); align-items: center; flex-wrap: wrap; }
        .sr-title { color: var(--da-text); font-size: var(--fs-lead); font-weight: 600; line-height: 1.35; margin: 0; transition: color var(--t-base); }
        .sr-snippet {
          color: var(--da-muted); font-size: 14px; line-height: 1.6; margin: 0;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }
        .sr-snippet mark { background: rgba(50,255,126,0.16); color: var(--da-text); border-radius: 2px; padding: 0 2px; }
        .sr-empty { color: var(--da-muted); font-size: 15px; line-height: 1.6; padding: var(--sp-8) 0; }
        .sr-empty a { color: var(--da-green); }
        .sr-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
        .sr-chip {
          color: var(--da-text-strong); background: var(--da-card); border: 1px solid var(--da-border); border-radius: 999px;
          padding: 6px 14px; font-size: 13px; text-decoration: none; white-space: nowrap;
        }
        .sr-chip:hover { border-color: var(--da-green); color: var(--da-green); }
        @media (max-width: 640px) {
          .sr-hero { padding: 32px var(--sp-5) 28px; }
          .sr-results { padding: var(--sp-6) var(--sp-5) var(--sp-16); }
          .sr-item { gap: var(--sp-4); }
          .sr-cover { width: 88px; height: 66px; }
          .sr-title { font-size: var(--fs-body); }
          .sr-btn { padding: 0 16px; }
        }
      `}</style>

      <section className="sr-hero">
        <div className="sr-inner">
          <h1 className="sr-h1">Suche</h1>
          <form action="/suche" method="get" role="search" className="sr-form">
            <input
              className="sr-input"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Artikel durchsuchen"
              aria-label="Suchbegriff"
              maxLength={200}
              autoFocus={query === ""}
              enterKeyHint="search"
            />
            <button type="submit" className="sr-btn">Suchen</button>
          </form>
          <p className="sr-hint">
            Sucht in Titel, Abstract, Tags und Text aller Artikel. <code>&quot;genaue Phrase&quot;</code> in
            Anführungszeichen, <code>-wort</code> schliesst aus, <code>or</code> verbindet Alternativen.
          </p>
        </div>
      </section>

      <section className="sr-results" aria-live="polite">
        <div className="sr-inner">
        {query === "" ? (
          <div className="sr-empty">
            Wonach suchst du? Zum Beispiel:
            <div className="sr-chips">
              {EXAMPLES.map((e) => (
                <Link key={e} href={`/suche?q=${encodeURIComponent(e)}`} className="sr-chip">{e}</Link>
              ))}
            </div>
          </div>
        ) : failed ? (
          <p className="sr-empty" role="alert">Die Suche ist gerade nicht erreichbar. Bitte später nochmals versuchen.</p>
        ) : hits.length === 0 ? (
          <p className="sr-empty">
            Keine Treffer für «{query}». Weniger oder andere Wörter versuchen, oder im{" "}
            <Link href="/tags">Themenverzeichnis</Link> stöbern.
          </p>
        ) : (
          <>
            <p className="sr-count">
              {hits.length === SEARCH_LIMIT ? `Die ${SEARCH_LIMIT} besten Treffer` : `${hits.length} Treffer`} für «{query}»
            </p>
            {hits.map(({ article, snippet }, i) => {
              const row = articleToListRow(article, i);
              const accent = accentFor(article.category?.slug);
              return (
                <Link key={article.id} href={row.href} className="sr-item">
                  <div className="sr-cover">
                    <Image src={row.image} alt="" fill sizes="(max-width: 640px) 88px, 156px" style={{ objectFit: "cover" }} unoptimized />
                  </div>
                  <div className="sr-body">
                    <div className="sr-head">
                      <span className="sr-cat" style={{ color: accent }}>{row.category}</span>
                    </div>
                    <h2 className="sr-title">{row.title}</h2>
                    <p className="sr-snippet">
                      {snippetParts(snippet).map((p, k) => (p.hit ? <mark key={k}>{p.text}</mark> : <span key={k}>{p.text}</span>))}
                    </p>
                    <div className="sr-meta">
                      <span style={{ color: "var(--da-muted)" }}>{row.author}</span>
                      {row.external && <ExternalBadge size="xs" />}
                      <span>·</span>
                      <span>{row.date}</span>
                      {row.readTime !== "—" && (
                        <>
                          <span>·</span>
                          <span>{row.readTime}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </>
        )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
