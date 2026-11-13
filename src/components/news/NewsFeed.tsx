"use client";

import { useEffect, useMemo, useState } from "react";
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
  ZEIT_OPTIONS,
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
        /* Filter (PR 202): ruhige Textoptionen, aktiv mit gruener Linie; die
           Bereiche als Umriss-Chips mit Trefferzahl. */
        .nf { margin: 0 0 var(--sp-10); padding: 14px 0 16px; border-top: 1px solid var(--da-border); border-bottom: 1px solid var(--da-border); display: flex; flex-direction: column; gap: 10px; }
        .nf-row { display: grid; grid-template-columns: 96px minmax(0, 1fr); align-items: center; gap: 12px; }
        .nf-l { color: var(--da-muted); font-size: 13px; }
        .nf-opts { display: flex; flex-wrap: wrap; gap: 4px 18px; align-items: center; }
        .nf-tab {
          background: none; border: none; padding: 4px 0; cursor: pointer; font-family: inherit; font-size: 14px;
          color: var(--da-muted); border-bottom: 2px solid transparent;
        }
        .nf-tab:hover { color: var(--da-text); }
        .nf-tab[aria-pressed="true"] { color: var(--da-text); font-weight: 600; border-bottom-color: var(--da-green); }
        .nf-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .nf-chip {
          display: inline-flex; align-items: baseline; gap: 6px; cursor: pointer; font-family: inherit; font-size: 13px;
          background: transparent; color: var(--da-text-strong); border: 1px solid var(--da-border); border-radius: 999px; padding: 5px 12px;
        }
        .nf-chip small { color: var(--da-muted-soft); font-size: 12px; font-variant-numeric: tabular-nums; }
        .nf-chip:hover { border-color: var(--da-muted); }
        .nf-chip[aria-pressed="true"] { border-color: var(--da-green); color: var(--da-text); background: rgba(50,255,126,0.08); }
        .nf-chip[aria-pressed="true"] small { color: var(--da-green); }
        .nf-chip:disabled { opacity: 0.4; cursor: default; }
        .nf-tab:focus-visible, .nf-chip:focus-visible, .nf-reset:focus-visible { outline: 2px solid var(--da-green); outline-offset: 2px; border-radius: 3px; }
        .nf-hint { color: var(--da-muted-soft); font-size: 12px; align-self: center; }
        .nf-foot { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; padding-top: 2px; }
        .nf-count { color: var(--da-text-strong); font-size: 13px; font-variant-numeric: tabular-nums; }
        .nf-reset { background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; font-size: 13px; color: var(--da-green); }
        .nf-empty { color: var(--da-muted); font-size: 15px; padding: var(--sp-6) 0; }
        @media (max-width: 640px) {
          .nf-row { grid-template-columns: minmax(0, 1fr); gap: 4px; }
          .nf-opts { gap: 2px 16px; }
          .nf-tab { white-space: nowrap; }
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

export default function NewsFeed({ items, nowIso }: { items: NewsItem[]; nowIso: string }) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [filters, setFilters] = useState<NewsFilters>(NO_FILTERS);

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

  return (
    <>
      <style>{CSS}</style>
      <div className="nf" role="search" aria-label="Meldungen filtern">
        <div className="nf-row">
          <span className="nf-l" id="nf-zeit">Zeitraum</span>
          <div className="nf-opts" role="group" aria-labelledby="nf-zeit">
            {ZEIT_OPTIONS.map((o) => (
              <button key={o.key} type="button" className="nf-tab" aria-pressed={filters.zeit === o.key}
                onClick={() => update({ ...filters, zeit: o.key })}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="nf-row">
          <span className="nf-l" id="nf-bereich">Tragweite</span>
          <div className="nf-chips" role="group" aria-labelledby="nf-bereich">
            {ASSESSMENT_DIMENSIONS.map((d) => {
              const on = filters.bereiche.includes(d.key);
              const n = countWith(items, filters, now, { bereiche: [d.key] });
              return (
                <button key={d.key} type="button" className="nf-chip" aria-pressed={on} disabled={!on && n === 0}
                  title={`${d.label}: mindestens mittel`}
                  onClick={() => update({ ...filters, bereiche: on ? filters.bereiche.filter((k) => k !== d.key) : [...filters.bereiche, d.key] })}>
                  {d.label} <small>{n}</small>
                </button>
              );
            })}
            <span className="nf-hint">ab «mittel»</span>
          </div>
        </div>
        <div className="nf-row">
          <span className="nf-l" id="nf-rel">Relevanz</span>
          <div className="nf-opts" role="group" aria-labelledby="nf-rel">
            {RELEVANZ_OPTIONS.map((o) => (
              <button key={o.key} type="button" className="nf-tab" aria-pressed={filters.relevanz === o.key}
                onClick={() => update({ ...filters, relevanz: o.key })}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {rubriken.length > 1 && (
          <div className="nf-row">
            <span className="nf-l" id="nf-rub">Rubrik</span>
            <div className="nf-opts" role="group" aria-labelledby="nf-rub">
              <button type="button" className="nf-tab" aria-pressed={filters.rubrik === null}
                onClick={() => update({ ...filters, rubrik: null })}>
                Alle
              </button>
              {rubriken.map((k) => (
                <button key={k} type="button" className="nf-tab" aria-pressed={filters.rubrik === k}
                  onClick={() => update({ ...filters, rubrik: k })}>
                  {NEWS_CATEGORY_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="nf-foot" aria-live="polite">
          <span className="nf-count">{shown.length} {shown.length === 1 ? "Meldung" : "Meldungen"}</span>
          {filtered && (
            <button type="button" className="nf-reset" onClick={() => update(NO_FILTERS)}>Filter zurücksetzen</button>
          )}
        </div>
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
    </>
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
