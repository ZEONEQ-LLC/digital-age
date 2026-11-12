import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import ExternalBadge from "@/components/ExternalBadge";
import Footer from "@/components/Footer";
import { articleToListRow } from "@/lib/mappers/articleMappers";
import { searchArticles, SEARCH_LIMIT } from "@/lib/search/articles";
import { searchPodcasts, searchPrompts, searchStartups, OTHER_LIMIT, type OtherHit, type OtherKind, type OtherResult } from "@/lib/search/more";
import { normalizeQuery, snippetParts } from "@/lib/search/snippet";

// Volltextsuche (/suche?q=…&typ=…), Postgres-FTS ueber publizierte Artikel,
// Prompts, Podcasts und Startups (seit PR 195 als eigene Bloecke unter den
// Artikeln, Entscheid Ali 12.11.2026). Ohne typ: alle Artikel-Treffer, je
// Block hoechstens BLOCK_PREVIEW weitere; typ=… zeigt nur diesen Typ ganz.
// Ergebnisseiten gehoeren nicht in den Index: noindex, follow.

export const metadata: Metadata = {
  title: "Suche",
  description: "Volltextsuche in Artikeln, Prompts, Podcasts und Startups von digital-age.",
  alternates: { canonical: "/suche" },
  robots: { index: false, follow: true },
};

type SearchParams = Promise<{ q?: string | string[]; typ?: string | string[] }>;

type Kind = "artikel" | OtherKind;

const KIND_LABEL: Record<Kind, string> = {
  artikel: "Artikel",
  prompts: "Prompts",
  podcasts: "Podcasts",
  startups: "Startups",
};

const OTHER_KINDS: OtherKind[] = ["prompts", "podcasts", "startups"];

const BLOCK_PREVIEW = 5;

function parseKind(raw: string | undefined): Kind | null {
  return raw === "artikel" || raw === "prompts" || raw === "podcasts" || raw === "startups" ? raw : null;
}

function hrefFor(query: string, kind: Kind | null): string {
  const q = `q=${encodeURIComponent(query)}`;
  return kind ? `/suche?${q}&typ=${kind}` : `/suche?${q}`;
}

function countText(n: number, limit: number): string {
  return n >= limit ? `${limit}+` : String(n);
}

function Snippet({ text }: { text: string }) {
  return (
    <p className="sr-snippet">
      {snippetParts(text).map((p, k) => (p.hit ? <mark key={k}>{p.text}</mark> : <span key={k}>{p.text}</span>))}
    </p>
  );
}

function OtherItem({ hit, kind }: { hit: OtherHit; kind: OtherKind }) {
  return (
    <Link href={hit.href} className="sr-item">
      {kind !== "prompts" && (
        <div className={kind === "startups" ? "sr-thumb sr-thumb--logo" : "sr-thumb"} aria-hidden>
          {hit.image ? (
            <Image src={hit.image} alt="" fill sizes="72px" style={{ objectFit: kind === "startups" ? "contain" : "cover" }} unoptimized />
          ) : (
            <span className="sr-initial">{hit.title.charAt(0).toUpperCase()}</span>
          )}
        </div>
      )}
      <div className="sr-body">
        <div className="sr-head">
          <span className="sr-cat" style={{ color: "var(--da-green)" }}>{hit.meta}</span>
        </div>
        <h3 className="sr-title">{hit.title}</h3>
        {hit.snippet.trim() !== "" && <Snippet text={hit.snippet} />}
      </div>
    </Link>
  );
}

const EXAMPLES = ["AI Act", "Banken", "Agenten", "Schweiz"];

function accentFor(categorySlug: string | undefined): string {
  return categorySlug === "future-tech" ? "var(--da-purple)" : "var(--da-green)";
}

export default async function SuchePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = params.q;
  const query = normalizeQuery(Array.isArray(raw) ? raw[0] : raw);
  const kind = parseKind(Array.isArray(params.typ) ? params.typ[0] : params.typ);
  const [articles, prompts, podcasts, startups] = await Promise.all([
    searchArticles(query),
    searchPrompts(query),
    searchPodcasts(query),
    searchStartups(query),
  ]);
  const { hits, failed } = articles;
  const others: Record<OtherKind, OtherResult> = { prompts, podcasts, startups };
  const counts: Record<Kind, number> = {
    artikel: hits.length,
    prompts: prompts.hits.length,
    podcasts: podcasts.hits.length,
    startups: startups.hits.length,
  };
  const total = counts.artikel + counts.prompts + counts.podcasts + counts.startups;
  // Eine Liste am Limit: die Summe ist eine Untergrenze.
  const capped = counts.artikel >= SEARCH_LIMIT || OTHER_KINDS.some((k) => counts[k] >= OTHER_LIMIT);
  const allFailed = failed && prompts.failed && podcasts.failed && startups.failed;
  const showArticles = kind === null || kind === "artikel";
  const shownOthers = OTHER_KINDS.filter((k) => (kind === null ? counts[k] > 0 || others[k].failed : kind === k));

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
        .sr-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 var(--sp-6); }
        .sr-tab {
          display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px;
          border: 1px solid var(--da-border); background: var(--da-card); color: var(--da-text-strong);
          font-size: 13px; text-decoration: none; white-space: nowrap;
        }
        .sr-tab:hover { border-color: var(--da-green); color: var(--da-green); }
        .sr-tab[aria-current="page"] { border-color: var(--da-green); color: var(--da-dark); background: var(--da-green); font-weight: 700; }
        .sr-tab b { font-family: var(--da-font-mono); font-size: 12px; font-weight: 700; opacity: 0.8; }
        .sr-block { margin-top: var(--sp-10); }
        .sr-block:first-of-type { margin-top: 0; }
        .sr-block-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid var(--da-border); padding-bottom: var(--sp-2); }
        .sr-h2 { color: var(--da-text); font-family: var(--da-font-display); font-size: 22px; font-weight: 700; margin: 0; }
        .sr-h2 span { color: var(--da-muted); font-family: var(--da-font-mono); font-size: 13px; font-weight: 500; margin-left: 8px; }
        .sr-more { color: var(--da-green); font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap; }
        .sr-more:hover { text-decoration: underline; }
        .sr-more-row { padding-top: var(--sp-4); }
        .sr-thumb { position: relative; width: 72px; height: 72px; flex-shrink: 0; border-radius: var(--r-md); overflow: hidden; background: var(--da-card); border: 1px solid var(--da-border); display: flex; align-items: center; justify-content: center; }
        .sr-thumb--logo { background: #fff; }
        .sr-thumb--logo img { padding: 8px; }
        .sr-initial { color: var(--da-muted); font-family: var(--da-font-display); font-size: 26px; font-weight: 700; }
        .sr-note { color: var(--da-muted-soft); font-size: 14px; padding: var(--sp-4) 0; margin: 0; }
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
          .sr-thumb { width: 56px; height: 56px; }
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
              placeholder="Artikel, Prompts, Podcasts, Startups"
              aria-label="Suchbegriff"
              maxLength={200}
              autoFocus={query === ""}
              enterKeyHint="search"
            />
            <button type="submit" className="sr-btn">Suchen</button>
          </form>
          <p className="sr-hint">
            Sucht in Artikeln, Prompts, Podcasts und Startups. <code>&quot;genaue Phrase&quot;</code> in
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
        ) : allFailed ? (
          <p className="sr-empty" role="alert">Die Suche ist gerade nicht erreichbar. Bitte später nochmals versuchen.</p>
        ) : total === 0 && !failed ? (
          <p className="sr-empty">
            Keine Treffer für «{query}». Weniger oder andere Wörter versuchen, oder im{" "}
            <Link href="/tags">Themenverzeichnis</Link> stöbern.
          </p>
        ) : (
          <>
            <nav className="sr-tabs" aria-label="Treffer nach Typ">
              <Link href={hrefFor(query, null)} className="sr-tab" aria-current={kind === null ? "page" : undefined}>
                Alle <b>{total}{capped ? "+" : ""}</b>
              </Link>
              {(["artikel", ...OTHER_KINDS] as Kind[]).filter((k) => counts[k] > 0).map((k) => (
                <Link key={k} href={hrefFor(query, k)} className="sr-tab" aria-current={kind === k ? "page" : undefined}>
                  {KIND_LABEL[k]} <b>{countText(counts[k], k === "artikel" ? SEARCH_LIMIT : OTHER_LIMIT)}</b>
                </Link>
              ))}
            </nav>

            {showArticles && (failed || hits.length > 0 || kind === "artikel") && (
              <section className="sr-block" aria-labelledby="sr-h-artikel">
                <div className="sr-block-head">
                  <h2 className="sr-h2" id="sr-h-artikel">
                    Artikel<span>{hits.length === SEARCH_LIMIT ? `die ${SEARCH_LIMIT} besten Treffer` : `${hits.length} Treffer`}</span>
                  </h2>
                </div>
                {failed && <p className="sr-note" role="alert">Die Artikelsuche ist gerade nicht erreichbar.</p>}
                {!failed && hits.length === 0 && <p className="sr-note">Keine Artikel für «{query}».</p>}
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
                        <h3 className="sr-title">{row.title}</h3>
                        <Snippet text={snippet} />
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
              </section>
            )}

            {shownOthers.map((k) => {
              const res = others[k];
              const list = kind === null ? res.hits.slice(0, BLOCK_PREVIEW) : res.hits;
              return (
                <section key={k} className="sr-block" aria-labelledby={`sr-h-${k}`}>
                  <div className="sr-block-head">
                    <h2 className="sr-h2" id={`sr-h-${k}`}>
                      {KIND_LABEL[k]}<span>{res.hits.length === OTHER_LIMIT ? `die ${OTHER_LIMIT} besten Treffer` : `${res.hits.length} Treffer`}</span>
                    </h2>
                  </div>
                  {res.failed && <p className="sr-note" role="alert">Diese Suche ist gerade nicht erreichbar.</p>}
                  {!res.failed && res.hits.length === 0 && <p className="sr-note">Keine {KIND_LABEL[k]} für «{query}».</p>}
                  {list.map((hit) => <OtherItem key={hit.id} hit={hit} kind={k} />)}
                  {kind === null && res.hits.length > BLOCK_PREVIEW && (
                    <div className="sr-more-row">
                      <Link href={hrefFor(query, k)} className="sr-more">
                        Alle {res.hits.length === OTHER_LIMIT ? `${OTHER_LIMIT}+` : res.hits.length} {KIND_LABEL[k]} anzeigen →
                      </Link>
                    </div>
                  )}
                </section>
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
