"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CompanyCard from "@/components/CompanyCard";
import CompanyRow from "@/components/CompanyRow";
import ViewToggle, { type ViewMode } from "@/components/ViewToggle";
import { SWISS_STATUSES, EMPLOYEE_RANGES, type StartupCardVM } from "@/lib/mappers/startupMappers";
import type { SwissStatusCode, EmployeeRangeCode } from "@/lib/startupApi";

type Props = {
  all: StartupCardVM[];
  featured: StartupCardVM[];
  industries: string[];
  cities: string[];
};

const PAGE_SIZE = 9;
const PAGE_INCREMENT = 6;

type SwissFilter = "all" | SwissStatusCode;
type EmpFilter = "all" | EmployeeRangeCode;

export default function StartupsBrowser({ all, featured, industries, cities }: Props) {
  const [industry, setIndustry]   = useState<"Alle Branchen" | string>("Alle Branchen");
  const [city, setCity]           = useState<"Alle Städte" | string>("Alle Städte");
  const [status, setStatus]       = useState<SwissFilter>("all");
  const [emp, setEmp]             = useState<EmpFilter>("all");
  const [search, setSearch]       = useState("");
  const [view, setView]           = useState<ViewMode>("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const accent = "var(--da-green)";

  const filtered = useMemo(() => all.filter((c) => {
    if (industry !== "Alle Branchen" && c.industry !== industry) return false;
    if (city !== "Alle Städte" && c.city !== city) return false;
    if (status !== "all" && c.swiss_status !== status) return false;
    if (emp !== "all" && c.employee_range !== emp) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.tagline.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [all, industry, city, status, emp, search]);

  const nonFeatured = filtered.filter((c) => !c.is_featured);
  const shown = nonFeatured.slice(0, visibleCount);
  const hasFilter =
    industry !== "Alle Branchen" ||
    city !== "Alle Städte" ||
    status !== "all" ||
    emp !== "all" ||
    search.length > 0;

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
    setStatus("all");
    setEmp("all");
    setSearch("");
    setVisibleCount(PAGE_SIZE);
  };

  const handleIndustry = (v: string) => { setIndustry(v); setVisibleCount(PAGE_SIZE); };
  const handleCity     = (v: string) => { setCity(v);     setVisibleCount(PAGE_SIZE); };
  const handleStatus   = (v: SwissFilter) => { setStatus(v); setVisibleCount(PAGE_SIZE); };
  const handleEmp      = (v: EmpFilter) => { setEmp(v);   setVisibleCount(PAGE_SIZE); };
  const handleSearch   = (v: string) => { setSearch(v);   setVisibleCount(PAGE_SIZE); };

  const allIndustries = ["Alle Branchen", ...industries];
  const allCities = ["Alle Städte", ...cities];

  return (
    <>
      <style>{`
        .sa-shell { max-width: var(--max-content); margin: 0 auto; }
        .sa-section { padding: 56px var(--sp-8) 0; }
        .sa-section-h { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-6); }
        .sa-section-h__bar { width: 3px; height: 22px; background: var(--da-green); border-radius: 2px; }
        .sa-section-h__title { color: var(--da-text); font-family: var(--da-font-display); font-size: 22px; font-weight: 700; }

        .sa-feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-5); }

        .sa-grid-wrap { display: grid; grid-template-columns: 240px 1fr; gap: 48px; align-items: start; }
        .sa-aside { position: sticky; top: var(--aside-sticky-top); display: flex; flex-direction: column; gap: var(--sp-6); }

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
          .sa-grid-wrap { grid-template-columns: 1fr; gap: var(--sp-8); }
          .sa-aside { position: static; }
          .sa-feat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 720px) {
          .sa-feat-grid { grid-template-columns: 1fr; }
          .sa-main-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {featured.length > 0 && (
        <section className="sa-shell sa-section">
          <div className="sa-section-h">
            <span className="sa-section-h__bar" />
            <h2 className="sa-section-h__title">Spotlight</h2>
          </div>
          <div className="sa-feat-grid">
            {featured.map((c) => <CompanyCard key={c.id} company={c} accent={accent} />)}
          </div>
        </section>
      )}

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
              {allIndustries.map((ind) => {
                const active = ind === industry;
                const count = ind === "Alle Branchen" ? all.length : all.filter((c) => c.industry === ind).length;
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
              <button
                type="button"
                className={`sa-fbtn${status === "all" ? " sa-fbtn--active" : ""}`}
                onClick={() => handleStatus("all")}
              >
                <span className="sa-fbtn__l">Alle Status</span>
              </button>
              {SWISS_STATUSES.map((s) => {
                const active = status === s.code;
                return (
                  <button
                    key={s.code}
                    type="button"
                    className={`sa-fbtn${active ? " sa-fbtn--active" : ""}`}
                    onClick={() => handleStatus(s.code)}
                  >
                    <span className="sa-fbtn__l">
                      <span className="sa-fbtn__dot" style={{ background: s.color }} />
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="sa-flabel">Mitarbeitende</p>
              <button
                type="button"
                className={`sa-fbtn${emp === "all" ? " sa-fbtn--active" : ""}`}
                onClick={() => handleEmp("all")}
              >
                <span className="sa-fbtn__l">Alle</span>
              </button>
              {EMPLOYEE_RANGES.map((r) => {
                const active = emp === r.code;
                return (
                  <button
                    key={r.code}
                    type="button"
                    className={`sa-fbtn${active ? " sa-fbtn--active" : ""}`}
                    onClick={() => handleEmp(r.code)}
                  >
                    <span className="sa-fbtn__l">{r.label}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="sa-flabel">Stadt</p>
              {allCities.map((c) => {
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
    </>
  );
}
