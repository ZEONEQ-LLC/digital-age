import Link from "next/link";
import { newsClock, newsDayLabel, zurichDay, type NewsItem } from "@/lib/newsApi";
import { newsAnchor } from "@/lib/newsAnchor";

// News-Spalte der Startseite (Wunsch Ali 12.11.2026, Feinschliff PR 198 nach
// «sieht zu sehr nach KI aus»): gebaut wie ein Newsticker bei Heise oder NZZ.
// Keine Karte, keine Punkte, keine Mono-Versalien: Kopf mit Linie, links die
// Uhrzeit, rechts der Titel, darunter die Quelle. Ein Tageswechsel steht einmal
// als Zwischenzeile («Gestern»), nicht an jeder Meldung. Klick fuehrt auf /news
// an die Meldung.

function renderedAt(): Date {
  return new Date();
}

// Zwischenzeile nur beim ersten Eintrag eines anderen Tages als heute.
function withDayBreaks(items: NewsItem[], today: string): { item: NewsItem; day: string; dayBreak: boolean }[] {
  return items.map((item, i) => {
    const day = zurichDay(item.publishedAt);
    const prev = i === 0 ? today : zurichDay(items[i - 1].publishedAt);
    return { item, day, dayBreak: day !== prev };
  });
}

export default function NewsColumn({ items }: { items: NewsItem[] }) {
  const now = renderedAt();
  const rows = withDayBreaks(items, zurichDay(now.toISOString()));
  return (
    <aside className="nc" aria-labelledby="nc-h">
      <style>{`
        .nc { min-width: 0; align-self: start; border-top: 2px solid var(--da-text); padding-top: 14px; }
        .nc__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
        .nc__h { color: var(--da-text); font-family: var(--da-font-display); font-size: 22px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
        .nc__all { color: var(--da-muted); font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap; }
        .nc__all:hover { color: var(--da-green); }
        .nc__list { list-style: none; margin: 0; padding: 0; }
        .nc__day {
          color: var(--da-muted); font-size: 12px; font-weight: 600; padding: 14px 0 2px;
        }
        .nc__link {
          display: grid; grid-template-columns: 44px minmax(0, 1fr); column-gap: 10px;
          padding: 12px 0; border-bottom: 1px solid var(--da-border); text-decoration: none;
        }
        .nc__time { color: var(--da-green); font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; padding-top: 1px; }
        .nc__flag { color: var(--da-green); font-weight: 700; margin-right: 6px; }
        .nc__title {
          color: var(--da-text-strong); font-size: 15px; font-weight: 500; line-height: 1.38;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }
        .nc__src { grid-column: 2; color: var(--da-muted-soft); font-size: 12px; margin-top: 3px; }
        .nc__link:hover .nc__title { color: var(--da-text); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--da-border); }
        .nc__empty { color: var(--da-muted); font-size: 14px; padding: 14px 0; margin: 0; }
      `}</style>
      <div className="nc__head">
        <h2 className="nc__h" id="nc-h">News</h2>
        <Link href="/news" className="nc__all">Alle Meldungen →</Link>
      </div>
      {items.length === 0 ? (
        <p className="nc__empty">Gerade keine Meldungen.</p>
      ) : (
        <ol className="nc__list">
          {rows.map(({ item: it, day, dayBreak }) => {
            return (
              <li key={it.id}>
                {dayBreak && <p className="nc__day">{newsDayLabel(day, now)}</p>}
                <Link href={`/news#${newsAnchor(it)}`} className="nc__link">
                  <span className="nc__time">{newsClock(it.publishedAt)}</span>
                  <span className="nc__title">
                    {it.importance === 3 && <span className="nc__flag">Wichtig</span>}
                    {it.title}
                  </span>
                  <span className="nc__src">{it.sourceName}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
