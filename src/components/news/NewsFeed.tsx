"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  NEWS_CATEGORY_LABEL,
  newsClock,
  newsDayDate,
  newsDayLabel,
  zurichDay,
  type NewsItem,
} from "@/lib/newsFormat";
import { newsAnchors } from "@/lib/newsAnchor";
import {
  NO_FILTERS,
  RELEVANZ_OPTIONS,
  SEARCH_MAX,
  ZEIT_OPTIONS,
  activeFilterCount,
  countWith,
  filtersToSearch,
  isFiltered,
  matchesFilters,
  parseFilters,
  type NewsFilters,
} from "@/lib/newsFilter";
import { ASSESSMENT_DIMENSIONS, LEVEL_LABEL, assessmentHighlights, type Assessment } from "@/lib/newsTicker/assessment";

// Meldungen von /news mit Filtern (Newsticker-Stil seit PR 198, Einordnung
// seit PR 199, Filter seit PR 202). Client-Komponente: Der Server rendert die
// volle Liste (SEO, ohne JavaScript lesbar), nach dem Laden setzt die Seite die
// Filter aus der URL. `nowIso` kommt vom Server, damit «Heute»/«Gestern» beim
// Hydrieren gleich bleiben.
//
// Seit PR 204 (Rueckmeldung Ali 13.11.2026: «Filter haben wir normalerweise auf
// der linken Seite») stehen Suche und Filter in einer Seitenleiste wie bei den
// Prompts (/ai-prompts) und Rubriken. Unter 1024 px steht die Suche ueber der
// Liste, die Filter klappen hinter dem Knopf «Filter» auf.

const CSS = `
        /* Aufbau wie ein Newsticker (Heise, NZZ): Tageskopf, links die Uhrzeit,
           rechts Titel, Kurzfassung und Quelle. Ruhig: keine Versalien-Labels,
           keine Punkte, Quelle als dezenter Link (Feinschliff PR 198). */
        .nw-day + .nw-day { margin-top: var(--sp-12); }
        .nw-day-h {
          display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
          margin: 0 0 var(--sp-2); padding-bottom: 12px; border-bottom: 2px solid var(--da-text);
          color: var(--da-text); font-family: var(--da-font-display); font-size: 22px; font-weight: 700; letter-spacing: -0.01em;
        }
        .nw-day-h small { color: var(--da-muted); font-family: var(--da-font-body); font-size: 15px; font-weight: 400; letter-spacing: 0; }
        .nw-item {
          position: relative; display: grid; grid-template-columns: 56px minmax(0, 1fr); column-gap: var(--sp-4);
          padding: 18px 0 20px; border-bottom: 1px solid var(--da-border);
          scroll-margin-top: calc(var(--nav-h) + 56px);
        }
        /* Alte Marke «#n-<id>»: unsichtbar oben im Eintrag, gleiche Hervorhebung. */
        .nw-legacy { position: absolute; top: 0; left: 0; width: 0; height: 0; overflow: hidden; scroll-margin-top: calc(var(--nav-h) + 56px); }
        .nw-item:has(.nw-legacy:target) { background: rgba(50,255,126,0.05); box-shadow: -12px 0 0 rgba(50,255,126,0.05), 12px 0 0 rgba(50,255,126,0.05); }
        .nw-item:target { background: rgba(50,255,126,0.05); box-shadow: -12px 0 0 rgba(50,255,126,0.05), 12px 0 0 rgba(50,255,126,0.05); }
        .nw-time { color: var(--da-green); font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.45; }
        .nw-title { color: var(--da-text); font-size: 19px; font-weight: 600; line-height: 1.38; letter-spacing: -0.005em; margin: 0; }
        .nw-summary { color: #c4c4c4; font-size: 16px; line-height: 1.62; margin: 8px 0 0; }
        .nw-meta { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-top: 10px; font-size: 13px; color: var(--da-muted-soft); }
        .nw-src { color: var(--da-muted); font-weight: 600; text-decoration: none; }
        .nw-src:hover { color: var(--da-green); text-decoration: underline; text-underline-offset: 3px; }
        .nw-empty { color: var(--da-muted); font-size: 15px; }
        .nw-flag { color: var(--da-green); font-weight: 700; margin-right: 8px; }
        .nw-why { color: #b8b8b8; font-size: 15px; line-height: 1.55; margin: 10px 0 0; padding-left: 12px; border-left: 2px solid var(--da-border); }
        .nw-why b { color: var(--da-text); font-weight: 600; }
        .nw-why p { margin: 0; }
        .nw-why p + p { margin-top: 6px; }
        .nw-ass { margin-top: 12px; }
        .nw-ass-h { color: var(--da-text-strong); font-size: 13px; font-weight: 600; margin: 0 0 8px; }
        .nw-ass-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px 16px; max-width: 640px; }
        .nw-ass-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .nw-ass-l { color: var(--da-muted); font-size: 12px; }
        .nw-ass-row { display: flex; align-items: center; gap: 8px; }
        .nw-meter { display: grid; grid-template-columns: repeat(3, 14px); gap: 3px; }
        .nw-meter i { height: 6px; border-radius: 1px; background: var(--da-border); }
        .nw-meter i.on { background: var(--da-green); }
        .nw-ass-v { color: var(--da-text-strong); font-size: 12px; white-space: nowrap; }
        .nw-ass-note { color: var(--da-muted-soft); font-size: 12px; margin: 8px 0 0; }
@media (max-width: 640px) {
          .nw-item { grid-template-columns: 46px minmax(0, 1fr); column-gap: 10px; }
          .nw-time { font-size: 14px; }
          .nw-title { font-size: 17px; }
          .nw-summary { font-size: 15px; }
          .nw-ass-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .nw-day-h { font-size: 20px; }
        }
        /* Seitenleiste (PR 204), Aufbau wie /ai-prompts: Mono-Label, Liste mit
           Trennlinien, aktiv fett mit gruener Zahl. Tragweite mit Kaestchen,
           weil dort mehrere Optionen zugleich gelten. */
        .nf-grid { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 48px; align-items: start; }
        /* Liste bis zur rechten Kante (buendig mit der Navbar), Lesetext
           auf eine angenehme Zeilenlaenge begrenzt. */
        .nf-main { min-width: 0; }
        .nw-item > div + div { max-width: 760px; }
        .nf-aside { display: flex; flex-direction: column; gap: var(--sp-6); }
        .nf-groups { display: flex; flex-direction: column; gap: var(--sp-6); }
        .nf-label {
          display: block; color: var(--da-faint); font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 var(--sp-3);
        }
        .nf-sub { color: var(--da-muted-soft); font-size: 12px; margin: calc(-1 * var(--sp-2)) 0 4px; }
        .nf-search {
          width: 100%; box-sizing: border-box; background: var(--da-card); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: var(--r-sm); padding: 10px 14px; font-size: 13px; font-family: inherit;
        }
        .nf-search:focus { border-color: var(--da-green); outline: none; }
        .nf-opt {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          width: 100%; background: none; border: none; cursor: pointer; font-family: inherit;
          padding: 9px 0; border-bottom: 1px solid var(--da-border);
          font-size: 13px; text-align: left; color: var(--da-text-strong); font-weight: 400;
        }
        .nf-opt:hover { color: var(--da-text); }
        .nf-opt[aria-pressed="true"] { color: var(--da-text); font-weight: 700; }
        .nf-opt:disabled { opacity: 0.4; cursor: default; }
        .nf-opt__l { display: flex; align-items: center; gap: var(--sp-2); }
        .nf-n { font-family: var(--da-font-mono); font-size: 11px; color: var(--da-faint); font-weight: 400; }
        .nf-opt[aria-pressed="true"] .nf-n { color: var(--da-green); }
        .nf-check { width: 11px; height: 11px; border: 1px solid var(--da-muted-soft); border-radius: 2px; flex-shrink: 0; box-sizing: border-box; }
        .nf-opt[aria-pressed="true"] .nf-check { background: var(--da-green); border-color: var(--da-green); }
        .nf-opt:focus-visible, .nf-reset:focus-visible, .nf-toggle:focus-visible { outline: 2px solid var(--da-green); outline-offset: 2px; border-radius: 3px; }
        .nf-toggle {
          display: none; align-items: center; justify-content: space-between; gap: 10px; width: 100%;
          background: none; border: 1px solid var(--da-border); border-radius: var(--r-sm); padding: 10px 14px;
          color: var(--da-text-strong); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .nf-toggle[aria-expanded="true"] { border-color: var(--da-muted); }
        .nf-toggle span[aria-hidden] { color: var(--da-muted); font-weight: 400; }
        .nf-bar { display: flex; align-items: baseline; gap: var(--sp-3); flex-wrap: wrap; margin: 0 0 var(--sp-6); }
        .nf-count { color: var(--da-muted); font-family: var(--da-font-mono); font-size: 12px; font-variant-numeric: tabular-nums; }
        .nf-reset { background: none; border: none; padding: 0; cursor: pointer; color: var(--da-orange); font-family: var(--da-font-mono); font-size: 12px; }
        .nf-empty { color: var(--da-muted); font-size: 15px; padding: var(--sp-6) 0; }
        @media (max-width: 1024px) {
          .nf-grid { grid-template-columns: minmax(0, 1fr); gap: var(--sp-8); }
          .nf-aside { gap: var(--sp-3); }
          .nf-toggle { display: flex; }
          .nf-groups { display: none; }
          .nf-groups.is-open { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-6) var(--sp-8); padding-top: var(--sp-3); }
        }
        @media (max-width: 640px) {
          .nf-groups.is-open { grid-template-columns: minmax(0, 1fr); }
        }
`;

function groupByDay(items: NewsItem[]): [string, NewsItem[]][] {
  const map = new Map<string, NewsItem[]>();
  for (const it of items) {
    const day = zurichDay(it.publishedAt);
    map.set(day, [...(map.get(day) ?? []), it]);
  }
  return Array.from(map.entries());
}

export default function NewsFeed({ items, nowIso, intro }: { items: NewsItem[]; nowIso: string; intro?: ReactNode }) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [filters, setFilters] = useState<NewsFilters>(NO_FILTERS);
  const [open, setOpen] = useState(false);
  const ids = { search: useId(), groups: useId(), zeit: useId(), bereich: useId(), rel: useId(), rub: useId() };

  // Filter aus der URL erst nach dem Hydrieren lesen (statisches HTML zeigt alles).
  useEffect(() => {
    const read = () => setFilters(parseFilters(window.location.search));
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  function update(next: NewsFilters) {
    setFilters(next);
    const url = `${window.location.pathname}${filtersToSearch(next)}`;
    window.history.replaceState(null, "", url);
  }

  const shown = useMemo(() => items.filter((it) => matchesFilters(it, filters, now)), [items, filters, now]);
  const days = useMemo(() => groupByDay(shown), [shown]);
  const anchors = useMemo(() => newsAnchors(items), [items]);
  const rubriken = useMemo(
    () => Object.keys(NEWS_CATEGORY_LABEL).filter((k) => items.some((it) => it.category === k)),
    [items],
  );
  const filtered = isFiltered(filters);

  const activeCount = activeFilterCount(filters);
  const opt = (key: string, label: string, pressed: boolean, n: number, onClick: () => void, check = false) => (
    <button key={key} type="button" className="nf-opt" aria-pressed={pressed} disabled={!pressed && n === 0} onClick={onClick}>
      <span className="nf-opt__l">
        {check && <span className="nf-check" aria-hidden />}
        {label}
      </span>
      <span className="nf-n">{n}</span>
    </button>
  );

  return (
    <div className="nf-grid">
      <style>{CSS}</style>
      <aside className="nf-aside" aria-label="Suche und Filter">
        <div role="search">
          <label className="nf-label" htmlFor={ids.search}>Suche</label>
          <input
            id={ids.search}
            type="search"
            className="nf-search"
            placeholder="News durchsuchen …"
            maxLength={SEARCH_MAX}
            value={filters.q}
            onChange={(e) => update({ ...filters, q: e.target.value })}
          />
        </div>
        <button type="button" className="nf-toggle" aria-expanded={open} aria-controls={ids.groups} onClick={() => setOpen((v) => !v)}>
          {activeCount > 0 ? `Filter · ${activeCount} aktiv` : "Filter"}
          <span aria-hidden>{open ? "▴" : "▾"}</span>
        </button>
        <div id={ids.groups} className={open ? "nf-groups is-open" : "nf-groups"}>
          <div role="group" aria-labelledby={ids.zeit}>
            <p className="nf-label" id={ids.zeit}>Zeitraum</p>
            {ZEIT_OPTIONS.map((o) =>
              opt(o.key, o.label, filters.zeit === o.key, countWith(items, filters, now, { zeit: o.key }), () => update({ ...filters, zeit: o.key })),
            )}
          </div>
          <div role="group" aria-labelledby={ids.bereich}>
            <p className="nf-label" id={ids.bereich}>Tragweite</p>
            <p className="nf-sub">ab «mittel», mehrere wählbar</p>
            {ASSESSMENT_DIMENSIONS.map((d) => {
              const on = filters.bereiche.includes(d.key);
              return opt(d.key, d.label, on, countWith(items, filters, now, { bereiche: [d.key] }), () =>
                update({ ...filters, bereiche: on ? filters.bereiche.filter((k) => k !== d.key) : [...filters.bereiche, d.key] }), true);
            })}
          </div>
          <div role="group" aria-labelledby={ids.rel}>
            <p className="nf-label" id={ids.rel}>Relevanz</p>
            {RELEVANZ_OPTIONS.map((o) =>
              opt(o.key, o.label, filters.relevanz === o.key, countWith(items, filters, now, { relevanz: o.key }), () => update({ ...filters, relevanz: o.key })),
            )}
          </div>
          {rubriken.length > 1 && (
            <div role="group" aria-labelledby={ids.rub}>
              <p className="nf-label" id={ids.rub}>Rubrik</p>
              {opt("alle", "Alle", filters.rubrik === null, countWith(items, filters, now, { rubrik: null }), () => update({ ...filters, rubrik: null }))}
              {rubriken.map((k) =>
                opt(k, NEWS_CATEGORY_LABEL[k], filters.rubrik === k, countWith(items, filters, now, { rubrik: k }), () => update({ ...filters, rubrik: k })),
              )}
            </div>
          )}
        </div>
      </aside>

      <div className="nf-main">
      {intro}
      <div className="nf-bar" aria-live="polite">
        <span className="nf-count">{shown.length} {shown.length === 1 ? "Meldung" : "Meldungen"}{filtered ? ` von ${items.length}` : ""}</span>
        {filtered && <button type="button" className="nf-reset" onClick={() => update(NO_FILTERS)}>Filter zurücksetzen</button>}
      </div>

      {days.length === 0 && (
        <p className="nf-empty">
          Keine Meldungen für diese Auswahl.{" "}
          <button type="button" className="nf-reset" onClick={() => update(NO_FILTERS)}>Filter zurücksetzen</button>
        </p>
      )}
      {days.map(([day, list]) => {
        const label = newsDayLabel(day, now);
        const isNamed = label === "Heute" || label === "Gestern";
        return (
          <section key={day} className="nw-day" aria-labelledby={`d-${day}`}>
            <h2 className="nw-day-h" id={`d-${day}`}>
              {isNamed ? label : newsDayDate(day)}
              {isNamed && <small>{newsDayDate(day)}</small>}
            </h2>
            {list.map((it) => (
              <article key={it.id} id={anchors.get(it.id)} className="nw-item">
                {/* Alte Marke «#n-<id>» (bis PR 199) springt weiter hierher. */}
                <span id={`n-${it.id}`} className="nw-legacy" aria-hidden />
                <div className="nw-time">{newsClock(it.publishedAt)}</div>
                <div>
                  <h3 className="nw-title">
                    {it.importance === 3 && <span className="nw-flag">Wichtig</span>}
                    {it.title}
                  </h3>
                  <p className="nw-summary">{it.summary}</p>
                  {it.assessment && (
                    <div className="nw-why">
                      <p><b>Warum wichtig:</b> {it.assessment.warum}</p>
                      {it.assessment.kehrseite && <p><b>Kehrseite:</b> {it.assessment.kehrseite}</p>}
                    </div>
                  )}
                  {it.assessment && <AssessmentDetails a={it.assessment} />}
                  <p className="nw-meta">
                    <a className="nw-src" href={it.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {it.sourceName} ↗
                    </a>
                    {it.category && NEWS_CATEGORY_LABEL[it.category] && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{NEWS_CATEGORY_LABEL[it.category]}</span>
                      </>
                    )}
                  </p>
                </div>
              </article>
            ))}
          </section>
        );
      })}
      </div>
    </div>
  );
}

// Einordnung, immer sichtbar (Wunsch Ali 13.11.2026): Kopfzeile mit den
// Feldern ab «mittel», darunter alle vier Felder mit Stufe.
function AssessmentDetails({ a }: { a: Assessment }) {
  const top = assessmentHighlights(a);
  const label = top.length > 0
    ? `Einordnung: ${top.map((t) => `${t.label} ${LEVEL_LABEL[t.level]}`).join(" · ")}`
    : "Einordnung: geringe Tragweite";
  return (
    <div className="nw-ass">
      <p className="nw-ass-h">{label}</p>
      <div className="nw-ass-grid">
        {ASSESSMENT_DIMENSIONS.map((d) => (
          <div key={d.key} className="nw-ass-cell">
            <span className="nw-ass-l">{d.label}</span>
            <span className="nw-ass-row">
              <span className="nw-meter" aria-hidden>
                {[1, 2, 3].map((n) => <i key={n} className={a[d.key] >= n ? "on" : undefined} />)}
              </span>
              <span className="nw-ass-v">{a[d.key] === 0 ? "kein Bezug" : LEVEL_LABEL[a[d.key]]}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="nw-ass-note">{a.by === "editor" ? "Von der Redaktion eingeordnet." : "Einschätzung der KI auf Basis der Meldung."}</p>
    </div>
  );
}
