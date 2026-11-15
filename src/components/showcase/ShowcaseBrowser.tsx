"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ArticleListRow, { type ListArticle } from "@/components/ArticleListRow";
import { RULES_PATH } from "@/lib/startupTrust";

// Uebersicht /showcase: links die Einordnung und (ab zwei Branchen) der
// Branchenfilter, rechts die Liste. Aufbau wie das Verzeichnis /swiss-ai
// (Seitenleiste links, gleiche Filterzeilen). Der Server rendert die volle
// Liste; der Filter aus der URL (?branche=…) greift nach dem Hydrieren.

export type ShowcaseBrowserRow = ListArticle & { industry: string | null };

const ALL = "";

export default function ShowcaseBrowser({ rows }: { rows: ShowcaseBrowserRow[] }) {
  const industries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) if (r.industry) counts.set(r.industry, (counts.get(r.industry) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "de"));
  }, [rows]);
  const [industry, setIndustry] = useState<string>(ALL);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("branche");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliger Abgleich mit der URL nach dem Hydrieren
    if (fromUrl && industries.some(([name]) => name === fromUrl)) setIndustry(fromUrl);
  }, [industries]);

  function choose(next: string) {
    setIndustry(next);
    const url = new URL(window.location.href);
    if (next === ALL) url.searchParams.delete("branche");
    else url.searchParams.set("branche", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const shown = industry === ALL ? rows : rows.filter((r) => r.industry === industry);
  const showFilter = industries.length > 1;

  return (
    <section className="sb-shell">
      <style>{`
        .sb-shell { max-width: var(--max-content); margin: 0 auto; padding: var(--sp-12) var(--gutter) 0; }
        .sb-grid { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 48px; align-items: start; }
        .sb-aside { position: sticky; top: var(--aside-sticky-top); display: flex; flex-direction: column; gap: var(--sp-8); }
        .sb-about { color: var(--da-text-strong); font-size: 14px; line-height: 1.6; margin: 0; }
        .sb-about + .sb-about { margin-top: 12px; }
        .sb-link { color: var(--da-muted); font-size: 13px; text-decoration: underline; text-underline-offset: 3px; }
        .sb-link:hover { color: var(--da-text); }
        .sb-flabel {
          color: var(--da-faint); font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 var(--sp-3);
        }
        .sb-fbtn {
          display: flex; align-items: center; justify-content: space-between; width: 100%;
          background: none; border: none; border-bottom: 1px solid var(--da-border); cursor: pointer;
          padding: 9px 0; font-family: inherit; font-size: 13px; text-align: left; color: var(--da-text-strong);
        }
        .sb-fbtn[aria-pressed="true"] { color: var(--da-text); font-weight: 700; }
        .sb-fbtn span:last-child { font-family: var(--da-font-mono); font-size: 11px; color: var(--da-muted-soft); }
        .sb-fbtn[aria-pressed="true"] span:last-child { color: var(--da-orange); }
        .sb-count { color: var(--da-muted); font-size: 13px; margin: 0; padding-bottom: 14px; border-bottom: 2px solid var(--da-text); }
        .sb-empty { color: var(--da-muted); font-size: 15px; line-height: 1.6; padding: var(--sp-8) 0; margin: 0; max-width: 560px; }
        @media (max-width: 1024px) {
          .sb-grid { grid-template-columns: minmax(0, 1fr); gap: var(--sp-8); }
          .sb-aside { position: static; gap: var(--sp-6); }
          .sb-about { max-width: 640px; }
        }
        @media (max-width: 640px) { .sb-shell { padding-top: var(--sp-8); } }
      `}</style>
      <div className="sb-grid">
        <aside className="sb-aside">
          <div>
            <p className="sb-about">
              Hier schreiben Unternehmen aus dem Swiss-AI-Verzeichnis selbst. Die Beiträge sind als
              Unternehmensbeitrag oder Publireportage gekennzeichnet und stammen nicht von der Redaktion.
            </p>
            <p className="sb-about">
              <Link href={`${RULES_PATH}#showcase`} className="sb-link">Regeln des Showcase</Link>
            </p>
          </div>
          {showFilter && (
            <div>
              <p className="sb-flabel">Branche</p>
              <button type="button" className="sb-fbtn" aria-pressed={industry === ALL} onClick={() => choose(ALL)}>
                <span>Alle Branchen</span>
                <span>{rows.length}</span>
              </button>
              {industries.map(([name, count]) => (
                <button key={name} type="button" className="sb-fbtn" aria-pressed={industry === name} onClick={() => choose(name)}>
                  <span>{name}</span>
                  <span>{count}</span>
                </button>
              ))}
            </div>
          )}
          <Link href="/swiss-ai" className="sb-link">Zum Verzeichnis Swiss AI</Link>
        </aside>

        <div>
          <p className="sb-count" aria-live="polite">
            {shown.length === 1 ? "1 Beitrag" : `${shown.length} Beiträge`}
            {industry !== ALL ? ` · ${industry}` : ""}
          </p>
          {shown.length === 0 ? (
            <p className="sb-empty">
              Noch keine Beiträge. Unternehmen aus dem Verzeichnis können hier über ihre Arbeit schreiben.
            </p>
          ) : (
            shown.map((r) => <ArticleListRow key={r.id} article={r} dotColor="var(--da-orange)" />)
          )}
        </div>
      </div>
    </section>
  );
}
