"use client";

import { useMemo, useState } from "react";
import Footer from "@/components/Footer";
import NewsTicker from "@/components/NewsTicker";
import PodcastCard from "@/components/PodcastCard";
import { getPodcasts } from "@/lib/mockPodcastApi";
import {
  PODCAST_CATEGORIES,
  PODCAST_LANGUAGES,
  type PodcastCategory,
  type PodcastLanguage,
} from "@/types/podcast";

type LangFilter = "all" | PodcastLanguage;
type CategoryFilter = "all" | PodcastCategory;

export default function PodcastsPage() {
  const [lang, setLang] = useState<LangFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const all = useMemo(() => getPodcasts(), []);

  const filtered = useMemo(() => {
    return all.filter((p) => {
      if (lang !== "all" && p.language !== lang) return false;
      if (category !== "all" && p.category !== category) return false;
      return true;
    });
  }, [all, lang, category]);

  const usedLanguages = new Set(all.map((p) => p.language));
  const usedCategories = new Set(all.map((p) => p.category));

  const reset = () => {
    setLang("all");
    setCategory("all");
  };

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />

      <style>{`
        .pc-shell { max-width: var(--max-content); margin: 0 auto; }

        .pc-hero {
          position: relative; overflow: hidden;
          border-bottom: 1px solid var(--da-border);
          padding: 56px var(--sp-8) 40px;
        }
        .pc-hero__grid {
          position: absolute; inset: 0; opacity: 0.05;
          background-image:
            linear-gradient(var(--da-green) 1px, transparent 1px),
            linear-gradient(90deg, var(--da-green) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .pc-hero__inner { position: relative; }
        .pc-hero__overline {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
          margin-bottom: 14px;
        }
        .pc-hero__title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: clamp(36px, 5vw, 56px); font-weight: 700;
          line-height: 1.0; letter-spacing: -0.02em;
          margin-bottom: var(--sp-4);
        }
        .pc-hero__lead {
          color: var(--da-muted); font-size: 17px; line-height: 1.65;
          max-width: 640px;
        }
        .pc-hero__stats {
          display: flex; gap: 14px; flex-wrap: wrap;
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 12px; font-weight: 600;
          margin-top: 20px;
        }
        .pc-hero__stats strong { color: var(--da-text); font-weight: 700; }

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

        .pc-list-section { padding: 32px var(--sp-8) 0; }
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
          .pc-hero { padding: 40px var(--sp-6) 28px; }
          .pc-filterbar__inner { padding: 12px var(--sp-6); }
          .pc-filter-row { flex-direction: row; align-items: flex-start; }
          .pc-filter-label { min-width: 70px; padding-top: 6px; }
          .pc-filter-pills { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
          .pc-list-section { padding: 24px var(--sp-6) 0; }
        }
      `}</style>

      <section className="pc-hero">
        <div className="pc-hero__grid" aria-hidden />
        <div className="pc-shell pc-hero__inner">
          <p className="pc-hero__overline">&gt; Empfohlene Hör-Erlebnisse</p>
          <h1 className="pc-hero__title">Podcasts</h1>
          <p className="pc-hero__lead">
            Empfehlungen aus unserer Redaktion und von unseren Autoren — handverlesen und kommentiert.
          </p>
          <div className="pc-hero__stats">
            <span><strong>{all.length}</strong> {all.length === 1 ? "Folge" : "Folgen"}</span>
            <span>·</span>
            <span><strong>{usedLanguages.size}</strong> {usedLanguages.size === 1 ? "Sprache" : "Sprachen"}</span>
            <span>·</span>
            <span><strong>{usedCategories.size}</strong> {usedCategories.size === 1 ? "Kategorie" : "Kategorien"}</span>
          </div>
        </div>
      </section>

      <div className="pc-filterbar">
        <div className="pc-shell pc-filterbar__inner">
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
              {PODCAST_CATEGORIES.map((c) => {
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

      <section className="pc-shell pc-list-section">
        {filtered.length === 0 ? (
          <div className="pc-empty">
            <p className="pc-empty__msg">Keine Folgen mit diesen Filtern.</p>
            <button type="button" className="pc-empty__btn" onClick={reset}>
              Filter zurücksetzen →
            </button>
          </div>
        ) : (
          <div className="pc-list">
            {filtered.map((p) => (
              <PodcastCard key={p.id} podcast={p} />
            ))}
          </div>
        )}
      </section>

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
