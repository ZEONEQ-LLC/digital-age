import {
  NEWS_CATEGORY_LABEL,
  newsClock,
  newsDayDate,
  newsDayLabel,
  type NewsItem,
} from "@/lib/newsApi";
import { newsAnchors } from "@/lib/newsAnchor";
import { ASSESSMENT_DIMENSIONS, LEVEL_LABEL, assessmentHighlights, type Assessment } from "@/lib/newsTicker/assessment";

// Meldungen von /news, nach Tagen gruppiert (Newsticker-Stil seit PR 198,
// Einordnung seit PR 199). Eigene Komponente, damit Seite und Pruef-Mocks
// dieselbe Darstellung nutzen.

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
`;

export default function NewsFeed({ days, now }: { days: [string, NewsItem[]][]; now: Date }) {
  const anchors = newsAnchors(days.flatMap(([, list]) => list));
  return (
    <>
      <style>{CSS}</style>
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
