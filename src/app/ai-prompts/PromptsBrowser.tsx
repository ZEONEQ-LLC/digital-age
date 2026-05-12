"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PromptCard, { type Prompt } from "@/components/PromptCard";
import { catColor, diffColor, toolColor, type AiTool, type Difficulty } from "@/components/promptColors";

type Props = {
  all: Prompt[];
  featured: Prompt[];
};

const categories = ["Alle", "Business", "Kreativ", "Code", "Marketing", "Strategie", "Lernen", "Andere"] as const;
const tools: Array<"Alle Tools" | AiTool> = ["Alle Tools", "ChatGPT", "Claude", "Gemini", "Mehrere"];
const difficulties: Array<"Alle" | Difficulty> = ["Alle", "Anfänger", "Fortgeschritten", "Expert"];

type SortMode = "popular" | "title";

export default function PromptsBrowser({ all, featured }: Props) {
  const [cat, setCat]       = useState<(typeof categories)[number]>("Alle");
  const [tool, setTool]     = useState<"Alle Tools" | AiTool>("Alle Tools");
  const [diff, setDiff]     = useState<"Alle" | Difficulty>("Alle");
  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState<SortMode>("popular");

  const accent = "var(--da-green)";

  const filtered = useMemo(() => all.filter((p) => {
    if (cat !== "Alle" && p.category !== cat) return false;
    if (tool !== "Alle Tools" && p.tool !== tool) return false;
    if (diff !== "Alle" && p.difficulty !== diff) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.body.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [all, cat, tool, diff, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === "popular") arr.sort((a, b) => b.uses - a.uses);
    else                     arr.sort((a, b) => a.title.localeCompare(b.title, "de"));
    return arr;
  }, [filtered, sort]);

  const hasFilter = cat !== "Alle" || tool !== "Alle Tools" || diff !== "Alle" || search.length > 0;
  const reset = () => { setCat("Alle"); setTool("Alle Tools"); setDiff("Alle"); setSearch(""); };

  return (
    <>
      <style>{`
        .ap-shell { max-width: var(--max-content); margin: 0 auto; }
        .ap-section { padding: 48px var(--sp-8) 0; }
        .ap-section-tight { padding: 56px var(--sp-8) 0; }

        .ap-section-h { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-6); }
        .ap-section-h__bar { width: 3px; height: 22px; background: var(--da-green); border-radius: 2px; }
        .ap-section-h__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 22px; font-weight: 700;
        }

        .ap-feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }

        .ap-grid-wrap { display: grid; grid-template-columns: 220px 1fr; gap: 48px; align-items: start; }
        .ap-aside { position: sticky; top: var(--aside-sticky-top); display: flex; flex-direction: column; gap: var(--sp-6); }

        .ap-flabel {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: var(--sp-3);
        }
        .ap-search {
          width: 100%; background: var(--da-card); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: var(--r-sm);
          padding: 10px 14px; font-size: 13px;
        }
        .ap-search:focus { border-color: var(--da-green); outline: none; }
        .ap-fbtn {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; background: none; border: none; cursor: pointer;
          padding: 9px 0; border-bottom: 1px solid var(--da-border);
          font-size: 13px; text-align: left;
          color: var(--da-text-strong); font-weight: 400;
        }
        .ap-fbtn--active { color: var(--da-text); font-weight: 700; }
        .ap-fbtn__l { display: flex; align-items: center; gap: var(--sp-2); }
        .ap-fbtn__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
        .ap-fbtn__count { font-family: var(--da-font-mono); font-size: 11px; color: var(--da-border); }
        .ap-fbtn--active .ap-fbtn__count { color: var(--da-green); }

        .ap-cta-card {
          display: block;
          background: var(--da-card); border: 1px solid var(--da-orange);
          border-radius: var(--r-lg); padding: 18px;
          text-decoration: none;
        }
        .ap-cta-card__overline {
          color: var(--da-orange);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 8px;
        }
        .ap-cta-card__title { color: var(--da-text); font-size: 13px; font-weight: 600; margin-bottom: 12px; }
        .ap-cta-card__btn { color: var(--da-orange); font-size: 12px; font-weight: 700; }

        .ap-toolbar {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5);
        }
        .ap-toolbar__count { color: var(--da-muted); font-size: 12px; font-family: var(--da-font-mono); }
        .ap-toolbar__reset {
          background: none; border: none; color: var(--da-orange);
          font-size: 12px; cursor: pointer; margin-left: var(--sp-3);
          font-family: var(--da-font-mono);
        }
        .ap-sort {
          background: var(--da-card); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: var(--r-sm);
          padding: 7px 12px; font-size: 12px;
          font-family: var(--da-font-mono);
          cursor: pointer; outline: none;
        }
        .ap-sort:focus { border-color: var(--da-green); }

        .ap-main-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-4); }

        .ap-empty { text-align: center; padding: 80px 0; }
        .ap-empty__msg { color: var(--da-muted); font-size: 16px; }
        .ap-empty__btn {
          background: none; border: 1px solid var(--da-green); color: var(--da-green);
          padding: 10px 24px; border-radius: var(--r-sm); font-size: 13px; cursor: pointer;
          margin-top: var(--sp-4);
        }

        @media (max-width: 1024px) {
          .ap-grid-wrap { grid-template-columns: 1fr; gap: var(--sp-8); }
          .ap-aside { position: static; }
          .ap-feat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 720px) {
          .ap-feat-grid { grid-template-columns: 1fr; }
          .ap-main-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {featured.length > 0 && (
        <section className="ap-shell ap-section">
          <div className="ap-section-h">
            <span className="ap-section-h__bar" />
            <h2 className="ap-section-h__title">Top Prompts diese Woche</h2>
          </div>
          <div className="ap-feat-grid">
            {featured.map((p) => <PromptCard key={p.id} prompt={p} accent={accent} />)}
          </div>
        </section>
      )}

      <section className="ap-shell ap-section-tight">
        <div className="ap-grid-wrap">
          <aside className="ap-aside">
            <div>
              <p className="ap-flabel">Suche</p>
              <input
                type="text"
                placeholder="Prompt suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ap-search"
              />
            </div>

            <div>
              <p className="ap-flabel">Kategorie</p>
              {categories.map((c) => {
                const count = c === "Alle" ? all.length : all.filter((p) => p.category === c).length;
                const dot = c === "Alle" ? null : catColor(c);
                const active = c === cat;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`ap-fbtn${active ? " ap-fbtn--active" : ""}`}
                    onClick={() => setCat(c)}
                  >
                    <span className="ap-fbtn__l">
                      {dot && <span className="ap-fbtn__dot" style={{ background: dot, opacity: active ? 1 : 0.45 }} />}
                      {c}
                    </span>
                    <span className="ap-fbtn__count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="ap-flabel">Tool</p>
              {tools.map((t) => {
                const active = t === tool;
                return (
                  <button
                    key={t}
                    type="button"
                    className={`ap-fbtn${active ? " ap-fbtn--active" : ""}`}
                    onClick={() => setTool(t)}
                  >
                    <span className="ap-fbtn__l">
                      {t !== "Alle Tools" && <span className="ap-fbtn__dot" style={{ background: toolColor(t) }} />}
                      {t}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="ap-flabel">Schwierigkeit</p>
              {difficulties.map((d) => {
                const active = d === diff;
                return (
                  <button
                    key={d}
                    type="button"
                    className={`ap-fbtn${active ? " ap-fbtn--active" : ""}`}
                    onClick={() => setDiff(d)}
                  >
                    <span className="ap-fbtn__l">
                      {d !== "Alle" && <span className="ap-fbtn__dot" style={{ background: diffColor(d) }} />}
                      {d}
                    </span>
                  </button>
                );
              })}
            </div>

            <Link href="/ai-prompts/einreichen" className="ap-cta-card">
              <p className="ap-cta-card__overline">Mitmachen</p>
              <p className="ap-cta-card__title">Hast du einen guten Prompt?</p>
              <span className="ap-cta-card__btn">Einreichen →</span>
            </Link>
          </aside>

          <div>
            <div className="ap-toolbar">
              <p className="ap-toolbar__count">
                {sorted.length} {sorted.length === 1 ? "Prompt" : "Prompts"}
                {hasFilter && (
                  <button type="button" className="ap-toolbar__reset" onClick={reset}>
                    Filter zurücksetzen ×
                  </button>
                )}
              </p>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="ap-sort"
                aria-label="Sortierung"
              >
                <option value="popular">Beliebteste</option>
                <option value="title">A–Z</option>
              </select>
            </div>

            {sorted.length === 0 ? (
              <div className="ap-empty">
                <p className="ap-empty__msg">Keine Prompts gefunden.</p>
                <button type="button" className="ap-empty__btn" onClick={reset}>
                  Filter zurücksetzen
                </button>
              </div>
            ) : (
              <div className="ap-main-grid">
                {sorted.map((p) => <PromptCard key={p.id} prompt={p} accent={accent} />)}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
