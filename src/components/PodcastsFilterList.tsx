"use client";

import { useMemo, useState } from "react";
import PublicPodcastCard from "./PublicPodcastCard";
import { PODCAST_LANGUAGES, type PodcastCardVM } from "@/lib/mappers/podcastMappers";
import type { PodcastLanguage } from "@/lib/podcastApi";

type LangFilter = "all" | PodcastLanguage;
type CategoryFilter = "all" | string;

type Props = {
  podcasts: PodcastCardVM[];
  availableCategories: string[];
};

export default function PodcastsFilterList({ podcasts, availableCategories }: Props) {
  const [lang, setLang] = useState<LangFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = useMemo(() => {
    return podcasts.filter((p) => {
      if (lang !== "all" && p.language !== lang) return false;
      if (category !== "all" && p.category !== category) return false;
      return true;
    });
  }, [podcasts, lang, category]);

  const reset = () => {
    setLang("all");
    setCategory("all");
  };

  return (
    <>
      <style>{`
        .pc-filterbar {
          position: sticky;
          top: var(--nav-h);
          z-index: 50;
          background: rgba(28,28,30,0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--da-border);
        }
        .pc-filterbar__inner {
          padding: 14px var(--sp-8);
          display: flex; flex-direction: column; gap: 10px;
        }
        .pc-filter-row {
          display: flex; align-items: center; gap: 12px;
        }
        .pc-filter-label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          min-width: 84px;
          flex-shrink: 0;
        }
        .pc-filter-pills {
          display: flex; gap: 6px; flex-wrap: wrap;
          flex: 1; min-width: 0;
        }
        .pc-pill {
          background: var(--da-card); color: var(--da-muted);
          border: 1px solid var(--da-border);
          border-radius: var(--r-pill);
          padding: 6px 12px;
          font-size: 12px; font-weight: 600;
          cursor: pointer; white-space: nowrap;
          font-family: inherit;
          transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
        }
        .pc-pill:hover { color: var(--da-text); border-color: var(--da-muted-soft); }
        .pc-pill--active {
          background: var(--da-green);
          color: var(--da-dark);
          border-color: var(--da-green);
        }
        .pc-pill--lang {
          font-family: var(--da-font-mono);
          letter-spacing: 0.05em;
        }
        .pc-list-section { padding: 32px var(--sp-8) 0; max-width: var(--max-content); margin: 0 auto; }
        .pc-list { display: flex; flex-direction: column; gap: 14px; }
        .pc-empty { text-align: center; padding: 60px 0; }
        .pc-empty__msg { color: var(--da-muted); font-size: 15px; margin-bottom: 16px; }
        .pc-empty__btn {
          background: none; border: 1px solid var(--da-green);
          color: var(--da-green); padding: 9px 20px;
          border-radius: var(--r-sm); font-size: 13px; font-weight: 600;
          cursor: pointer;
          font-family: inherit;
        }
        .pc-empty__btn:hover { background: rgba(50,255,126,0.08); }
        @media (max-width: 720px) {
          .pc-filterbar__inner { padding: 12px var(--sp-6); }
          .pc-filter-row { flex-direction: row; align-items: flex-start; }
          .pc-filter-label { min-width: 70px; padding-top: 6px; }
          .pc-filter-pills { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
          .pc-list-section { padding: 24px var(--sp-6) 0; }
        }
      `}</style>

      <div className="pc-filterbar">
        <div style={{ maxWidth: "var(--max-content)", margin: "0 auto" }} className="pc-filterbar__inner">
          <div className="pc-filter-row">
            <span className="pc-filter-label">Sprache</span>
            <div className="pc-filter-pills">
              <button
                type="button"
                className={`pc-pill${lang === "all" ? " pc-pill--active" : ""}`}
                onClick={() => setLang("all")}
              >
                Alle
              </button>
              {PODCAST_LANGUAGES.map((l) => {
                const active = lang === l.code;
                return (
                  <button
                    key={l.code}
                    type="button"
                    className={`pc-pill pc-pill--lang${active ? " pc-pill--active" : ""}`}
                    onClick={() => setLang(l.code)}
                  >
                    {l.short} · {l.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pc-filter-row">
            <span className="pc-filter-label">Kategorie</span>
            <div className="pc-filter-pills">
              <button
                type="button"
                className={`pc-pill${category === "all" ? " pc-pill--active" : ""}`}
                onClick={() => setCategory("all")}
              >
                Alle
              </button>
              {availableCategories.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`pc-pill${active ? " pc-pill--active" : ""}`}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <section className="pc-list-section">
        {filtered.length === 0 ? (
          <div className="pc-empty">
            <p className="pc-empty__msg">Keine Folgen mit diesen Filtern.</p>
            <button type="button" className="pc-empty__btn" onClick={reset}>
              Filter zurücksetzen →
            </button>
          </div>
        ) : (
          <div className="pc-list">
            {filtered.map((vm) => (
              <PublicPodcastCard key={vm.id} vm={vm} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
