"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import CompanyCard, { statusColor, type Company, type SwissStatus } from "@/components/CompanyCard";
import CompanyRow from "@/components/CompanyRow";
import ViewToggle, { type ViewMode } from "@/components/ViewToggle";

const companies: Company[] = [
  { id: 1,  name: "DeepJudge",      tagline: "KI für Anwaltskanzleien — Dokumentenanalyse in Sekunden.", city: "Zürich",     industry: "LegalTech",     status: "Swiss Based",    employees: "11–50",  featured: true,  founded: 2020 },
  { id: 2,  name: "LatticeFlow AI", tagline: "Enterprise AI Trust & Compliance Platform.",               city: "Zürich",     industry: "AI Governance", status: "Swiss Founded",  employees: "51–200", featured: true,  founded: 2018 },
  { id: 3,  name: "Unique AG",       tagline: "FinTech AI-Assistenten für Relationship Manager.",         city: "Zürich",     industry: "FinTech",       status: "Swiss Based",    employees: "11–50",  featured: true,  founded: 2021 },
  { id: 4,  name: "Squirro",         tagline: "Cognitive Search für Banking & Versicherung.",             city: "Zürich",     industry: "FinTech",       status: "Swiss Based",    employees: "51–200", featured: false, founded: 2012 },
  { id: 5,  name: "Visium",          tagline: "Data Science Beratung & KI-Lösungen.",                     city: "Lausanne",   industry: "Consulting",    status: "Swiss Based",    employees: "51–200", featured: false, founded: 2018 },
  { id: 6,  name: "Nexoya",          tagline: "KI-gesteuerte Marketing-Optimierung.",                     city: "Zürich",     industry: "MarTech",       status: "Swiss Based",    employees: "11–50",  featured: false, founded: 2017 },
  { id: 7,  name: "Advertima",       tagline: "Computer Vision für Retail Analytics.",                    city: "St. Gallen", industry: "Retail",        status: "Swiss Based",    employees: "11–50",  featured: false, founded: 2016 },
  { id: 8,  name: "Faktion",         tagline: "Conversational AI für Enterprises.",                       city: "Zürich",     industry: "Enterprise",    status: "Active in CH",   employees: "51–200", featured: false, founded: 2015 },
  { id: 9,  name: "Scandit",         tagline: "Smart Data Capture mit Computer Vision.",                  city: "Zürich",     industry: "Logistics",     status: "Swiss Based",    employees: "200+",   featured: false, founded: 2009 },
  { id: 10, name: "Tinamu Labs",     tagline: "Autonome Drohnen-KI für Industrie.",                       city: "Zürich",     industry: "Robotics",      status: "Swiss Based",    employees: "11–50",  featured: false, founded: 2018 },
  { id: 11, name: "Modulos",         tagline: "AI Governance & Compliance Platform.",                     city: "Zürich",     industry: "AI Governance", status: "Swiss Based",    employees: "11–50",  featured: false, founded: 2019 },
  { id: 12, name: "Sherpany",        tagline: "AI-powered Meeting Management für Boards.",                city: "Zürich",     industry: "Enterprise",    status: "Swiss Based",    employees: "51–200", featured: false, founded: 2011 },
];

const industries = ["Alle Branchen", "FinTech", "LegalTech", "AI Governance", "MarTech", "Retail", "Logistics", "Robotics", "Enterprise", "Consulting"] as const;
const cities     = ["Alle Städte", "Zürich", "Lausanne", "St. Gallen", "Basel", "Bern", "Genf"] as const;
const statuses: Array<"Alle Status" | SwissStatus> = ["Alle Status", "Swiss Based", "Swiss Founded", "Active in CH"];

const PAGE_SIZE = 9;
const PAGE_INCREMENT = 6;

export default function SwissAIPage() {
  const [industry, setIndustry] = useState<(typeof industries)[number]>("Alle Branchen");
  const [city, setCity]         = useState<(typeof cities)[number]>("Alle Städte");
  const [status, setStatus]     = useState<"Alle Status" | SwissStatus>("Alle Status");
  const [search, setSearch]     = useState("");
  const [view, setView]         = useState<ViewMode>("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const accent = "var(--da-green)";

  const filtered = useMemo(() => companies.filter((c) => {
    if (industry !== "Alle Branchen" && c.industry !== industry) return false;
    if (city !== "Alle Städte" && c.city !== city) return false;
    if (status !== "Alle Status" && c.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.tagline.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [industry, city, status, search]);

  const featured = companies.filter((c) => c.featured);
  const nonFeatured = filtered.filter((c) => !c.featured);
  const shown = nonFeatured.slice(0, visibleCount);
  const hasFilter =
    industry !== "Alle Branchen" || city !== "Alle Städte" || status !== "Alle Status" || search.length > 0;

  const stats = useMemo(() => ([
    { n: `${companies.length}+`, l: "Unternehmen" },
    { n: `${new Set(companies.map((c) => c.city)).size}`, l: "Städte" },
    { n: `${new Set(companies.map((c) => c.industry)).size}`, l: "Branchen" },
    { n: "100%", l: "Schweizer Bezug" },
  ]), []);

  // Infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCount < nonFeatured.length) {
        setVisibleCount((v) => v + PAGE_INCREMENT);
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, nonFeatured.length]);

  const resetFilters = () => {
    setIndustry("Alle Branchen");
    setCity("Alle Städte");
    setStatus("Alle Status");
    setSearch("");
    setVisibleCount(PAGE_SIZE);
  };

  const handleIndustry = (v: (typeof industries)[number]) => { setIndustry(v); setVisibleCount(PAGE_SIZE); };
  const handleCity     = (v: (typeof cities)[number])     => { setCity(v);     setVisibleCount(PAGE_SIZE); };
  const handleStatus   = (v: "Alle Status" | SwissStatus) => { setStatus(v);   setVisibleCount(PAGE_SIZE); };
  const handleSearch   = (v: string)                       => { setSearch(v);   setVisibleCount(PAGE_SIZE); };

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />

      <style>{`
        .sa-shell { max-width: var(--max-content); margin: 0 auto; }
        .sa-hero {
          position: relative; overflow: hidden;
          border-bottom: 1px solid var(--da-border);
        }
        .sa-hero__bg { position: absolute; inset: 0; display: flex; opacity: 0.07; pointer-events: none; }
        .sa-hero__bg-bar { flex: 1; }
        .sa-hero__bg-bar:nth-child(odd)  { background: var(--da-green); }
        .sa-hero__bg-bar:nth-child(even) { background: var(--da-card); }
        .sa-hero__overlay {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(135deg, var(--da-dark) 0%, rgba(28,28,30,0.92) 100%);
        }
        .sa-hero__inner {
          position: relative;
          padding: 64px var(--sp-8) 56px;
        }
        .sa-hero__row {
          display: grid; grid-template-columns: 1fr auto;
          gap: 48px; align-items: center;
        }
        .sa-hero__overline {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
          margin-bottom: var(--sp-4);
        }
        .sa-hero__title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: clamp(36px, 5vw, 60px); font-weight: 700;
          line-height: 1.05; letter-spacing: -0.02em;
          margin-bottom: var(--sp-5);
        }
        .sa-hero__title em { font-style: normal; color: var(--da-green); }
        .sa-hero__lead {
          color: var(--da-muted); font-size: 17px; line-height: 1.7;
          max-width: 600px; margin-bottom: 36px;
        }
        .sa-hero__cta-row { display: flex; gap: var(--sp-3); flex-wrap: wrap; }
        .sa-hero__cta-primary {
          background: var(--da-green); color: var(--da-dark);
          font-size: 14px; font-weight: 700; padding: 13px 28px;
          border-radius: var(--r-sm); text-decoration: none;
        }
        .sa-hero__cta-secondary {
          background: none; color: var(--da-orange);
          border: 2px solid var(--da-orange);
          font-size: 14px; font-weight: 600; padding: 11px 28px;
          text-decoration: none;
          transition: background var(--t-base), color var(--t-base);
        }
        .sa-hero__cta-secondary:hover {
          background: var(--da-orange); color: var(--da-dark);
        }

        .sa-stats { display: flex; flex-direction: column; gap: 1px; }
        .sa-stat {
          padding: 20px 28px; background: rgba(42,42,46,0.6);
          border-bottom: 1px solid var(--da-border);
          display: flex; align-items: center; gap: var(--sp-4);
        }
        .sa-stat__n {
          color: var(--da-green); font-size: 28px; font-weight: 700;
          font-family: var(--da-font-display); min-width: 72px;
        }
        .sa-stat__l { color: var(--da-muted); font-size: 13px; }

        .sa-section { padding: 56px var(--sp-8) 0; }

        .sa-section-h { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-6); }
        .sa-section-h__bar { width: 3px; height: 22px; background: var(--da-green); border-radius: 2px; }
        .sa-section-h__title { color: var(--da-text); font-family: var(--da-font-display); font-size: 22px; font-weight: 700; }

        .sa-feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-5); }

        .sa-grid-wrap { display: grid; grid-template-columns: 240px 1fr; gap: 48px; align-items: start; }
        .sa-aside { position: sticky; top: 84px; display: flex; flex-direction: column; gap: var(--sp-6); }

        .sa-flabel {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: var(--sp-3);
        }
        .sa-search {
          width: 100%; background: var(--da-card); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: var(--r-sm);
          padding: 10px 14px; font-size: 13px;
        }
        .sa-search:focus { border-color: var(--da-green); outline: none; }
        .sa-fbtn {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; background: none; border: none; cursor: pointer;
          padding: 9px 0; border-bottom: 1px solid var(--da-border);
          font-size: 13px; text-align: left;
          color: var(--da-text-strong); font-weight: 400;
        }
        .sa-fbtn--active { color: var(--da-text); font-weight: 700; }
        .sa-fbtn__l { display: flex; align-items: center; gap: var(--sp-2); }
        .sa-fbtn__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
        .sa-fbtn__count { font-family: var(--da-font-mono); font-size: 11px; color: var(--da-border); }
        .sa-fbtn--active .sa-fbtn__count { color: var(--da-green); }
        .sa-fbtn--city-active { color: var(--da-green); font-weight: 700; }

        .sa-cta-eintragen {
          display: block; background: var(--da-card);
          border: 1px solid var(--da-orange);
          border-radius: var(--r-lg); padding: 20px;
          text-decoration: none;
        }
        .sa-cta-eintragen__overline {
          color: var(--da-orange);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 8px;
        }
        .sa-cta-eintragen__title { color: var(--da-text); font-size: 14px; font-weight: 600; margin-bottom: 6px; }
        .sa-cta-eintragen__hint { color: var(--da-muted); font-size: 12px; line-height: 1.5; margin-bottom: 14px; }
        .sa-cta-eintragen__btn {
          display: inline-block; background: var(--da-orange); color: var(--da-dark);
          font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: var(--r-sm);
        }

        .sa-toolbar {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5);
        }
        .sa-toolbar__count { color: var(--da-muted); font-size: 12px; font-family: var(--da-font-mono); }
        .sa-toolbar__reset {
          background: none; border: none; color: var(--da-orange);
          font-size: 12px; cursor: pointer; margin-left: var(--sp-3);
          font-family: var(--da-font-mono);
        }

        .sa-main-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-4); }

        .sa-empty { text-align: center; padding: 80px 0; }
        .sa-empty__msg { color: var(--da-muted); font-size: 16px; }
        .sa-empty__btn {
          background: none; border: 1px solid var(--da-green); color: var(--da-green);
          padding: 10px 24px; border-radius: var(--r-sm); font-size: 13px; cursor: pointer;
          margin-top: var(--sp-4);
        }

        .sa-loader { padding-top: var(--sp-8); padding-bottom: var(--sp-2); }
        .sa-loader__bar {
          height: 3px; background: var(--da-card); border-radius: 2px; margin-bottom: 10px;
        }
        .sa-loader__bar-fill { height: 100%; background: var(--da-green); transition: width 0.3s; }
        .sa-loader__hint {
          color: var(--da-faint); font-size: 12px;
          font-family: var(--da-font-mono); text-align: center;
        }

        @media (max-width: 1024px) {
          .sa-hero__row { grid-template-columns: 1fr; gap: var(--sp-8); }
          .sa-grid-wrap { grid-template-columns: 1fr; gap: var(--sp-8); }
          .sa-aside { position: static; }
          .sa-feat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 720px) {
          .sa-feat-grid { grid-template-columns: 1fr; }
          .sa-main-grid { grid-template-columns: 1fr; }
          .sa-hero__inner { padding: 48px var(--sp-6) 40px; }
        }
      `}</style>

      {/* Hero */}
      <section className="sa-hero">
        <div className="sa-hero__bg" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="sa-hero__bg-bar" />)}
        </div>
        <div className="sa-hero__overlay" aria-hidden />
        <div className="sa-hero__inner sa-shell">
          <div className="sa-hero__row">
            <div>
              <p className="sa-hero__overline">🇨🇭 Swiss AI Landscape</p>
              <h1 className="sa-hero__title">
                Die Schweizer KI-Landschaft —<br />
                <em>an einem Ort.</em>
              </h1>
              <p className="sa-hero__lead">
                Kuratierte Übersicht von KI-Unternehmen mit Sitz oder Präsenz in der Schweiz. Finde die passende Lösung — mit Fokus auf Datenschutz und Schweizer Werte.
              </p>
              <div className="sa-hero__cta-row">
                <a href="#directory" className="sa-hero__cta-primary">Verzeichnis durchsuchen</a>
                <Link href="/swiss-ai/einreichen" className="sa-hero__cta-secondary">Unternehmen einreichen →</Link>
              </div>
            </div>
            <div className="sa-stats">
              {stats.map(({ n, l }) => (
                <div key={l} className="sa-stat">
                  <span className="sa-stat__n">{n}</span>
                  <span className="sa-stat__l">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="sa-shell sa-section">
        <div className="sa-section-h">
          <span className="sa-section-h__bar" />
          <h2 className="sa-section-h__title">Featured Startups</h2>
        </div>
        <div className="sa-feat-grid">
          {featured.map((c) => <CompanyCard key={c.id} company={c} accent={accent} />)}
        </div>
      </section>

      {/* Directory */}
      <section id="directory" className="sa-shell sa-section">
        <div className="sa-grid-wrap">
          <aside className="sa-aside">
            <div>
              <p className="sa-flabel">Suche</p>
              <input
                type="text"
                placeholder="Unternehmen suchen..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="sa-search"
              />
            </div>

            <div>
              <p className="sa-flabel">Branche</p>
              {industries.map((ind) => {
                const active = ind === industry;
                const count = ind === "Alle Branchen" ? companies.length : companies.filter((c) => c.industry === ind).length;
                return (
                  <button
                    key={ind}
                    type="button"
                    className={`sa-fbtn${active ? " sa-fbtn--active" : ""}`}
                    onClick={() => handleIndustry(ind)}
                  >
                    <span>{ind}</span>
                    <span className="sa-fbtn__count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="sa-flabel">Status</p>
              {statuses.map((s) => {
                const active = s === status;
                return (
                  <button
                    key={s}
                    type="button"
                    className={`sa-fbtn${active ? " sa-fbtn--active" : ""}`}
                    onClick={() => handleStatus(s)}
                  >
                    <span className="sa-fbtn__l">
                      {s !== "Alle Status" && <span className="sa-fbtn__dot" style={{ background: statusColor(s as SwissStatus) }} />}
                      {s}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="sa-flabel">Stadt</p>
              {cities.map((c) => {
                const active = c === city;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`sa-fbtn${active ? " sa-fbtn--city-active" : ""}`}
                    onClick={() => handleCity(c)}
                  >
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>

            <Link href="/swiss-ai/einreichen" className="sa-cta-eintragen">
              <p className="sa-cta-eintragen__overline">Eintragen</p>
              <p className="sa-cta-eintragen__title">Dein Unternehmen fehlt?</p>
              <p className="sa-cta-eintragen__hint">Kosten- und bedingungslos eintragen lassen.</p>
              <span className="sa-cta-eintragen__btn">Einreichen →</span>
            </Link>
          </aside>

          <div>
            <div className="sa-toolbar">
              <p className="sa-toolbar__count">
                {nonFeatured.length} {nonFeatured.length === 1 ? "Unternehmen" : "Unternehmen"}
                {hasFilter && (
                  <button type="button" className="sa-toolbar__reset" onClick={resetFilters}>
                    Filter zurücksetzen ×
                  </button>
                )}
              </p>
              <ViewToggle value={view} onChange={setView} accent={accent} />
            </div>

            {filtered.length === 0 ? (
              <div className="sa-empty">
                <p className="sa-empty__msg">Keine Unternehmen gefunden.</p>
                <button type="button" className="sa-empty__btn" onClick={resetFilters}>
                  Filter zurücksetzen
                </button>
              </div>
            ) : view === "grid" ? (
              <div className="sa-main-grid">
                {shown.map((c) => <CompanyCard key={c.id} company={c} accent={accent} />)}
              </div>
            ) : (
              <div>
                {shown.map((c) => <CompanyRow key={c.id} company={c} accent={accent} />)}
              </div>
            )}

            <div ref={loaderRef} className="sa-loader">
              {visibleCount < nonFeatured.length ? (
                <>
                  <div className="sa-loader__bar">
                    <div
                      className="sa-loader__bar-fill"
                      style={{ width: `${Math.round((visibleCount / nonFeatured.length) * 100)}%` }}
                    />
                  </div>
                  <p className="sa-loader__hint">{shown.length} von {nonFeatured.length} · Scrolle für mehr</p>
                </>
              ) : nonFeatured.length > 0 ? (
                <>
                  <div className="sa-loader__bar" style={{ background: "var(--da-green)" }} />
                  <p className="sa-loader__hint" style={{ color: "var(--da-muted)" }}>
                    Alle {nonFeatured.length} Unternehmen geladen
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
