import Link from "next/link";
import { NEWS_CATEGORY_ACCENT, newsTimeLabel, type NewsItem } from "@/lib/newsApi";

// News-Spalte der Startseite (Wunsch Ali 12.11.2026): die neuesten Meldungen
// des Tickers, Klick fuehrt auf /news an die Meldung (Kurzfassung + Quelle).

function renderedAt(): Date {
  return new Date();
}

export default function NewsColumn({ items }: { items: NewsItem[] }) {
  const now = renderedAt();
  return (
    <aside className="nc" aria-labelledby="nc-h">
      <style>{`
        .nc { border: 1px solid var(--da-border); border-radius: 8px; background: var(--da-card); padding: 20px 22px 8px; min-width: 0; align-self: start; }
        .nc__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--da-border); }
        .nc__h { display: flex; align-items: center; gap: 10px; color: var(--da-text); font-family: var(--da-font-display); font-size: 20px; font-weight: 700; margin: 0; }
        .nc__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--da-green); box-shadow: 0 0 0 4px rgba(50,255,126,0.15); }
        .nc__all { color: var(--da-green); font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap; }
        .nc__all:hover { text-decoration: underline; }
        .nc__list { list-style: none; margin: 0; padding: 0; }
        .nc__item + .nc__item { border-top: 1px solid var(--da-border); }
        .nc__link { display: block; padding: 14px 0; text-decoration: none; }
        .nc__meta { display: flex; align-items: center; gap: 8px; color: var(--da-muted-soft); font-family: var(--da-font-mono); font-size: 11px; letter-spacing: 0.04em; margin-bottom: 5px; }
        .nc__cat { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .nc__title { color: var(--da-text-strong); font-size: 15px; font-weight: 600; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .nc__link:hover .nc__title { color: var(--da-green); }
        .nc__empty { color: var(--da-muted); font-size: 14px; padding: 14px 0; margin: 0; }
      `}</style>
      <div className="nc__head">
        <h2 className="nc__h" id="nc-h"><span className="nc__dot" aria-hidden />News</h2>
        <Link href="/news" className="nc__all">Alle News →</Link>
      </div>
      {items.length === 0 ? (
        <p className="nc__empty">Gerade keine Meldungen.</p>
      ) : (
        <ol className="nc__list">
          {items.map((it) => (
            <li key={it.id} className="nc__item">
              <Link href={`/news#n-${it.id}`} className="nc__link">
                <span className="nc__meta">
                  {it.category && <span className="nc__cat" style={{ background: NEWS_CATEGORY_ACCENT[it.category] ?? "var(--da-muted)" }} aria-hidden />}
                  <span>{newsTimeLabel(it.publishedAt, now)}</span>
                  <span>·</span>
                  <span>{it.sourceName}</span>
                </span>
                <span className="nc__title">{it.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
