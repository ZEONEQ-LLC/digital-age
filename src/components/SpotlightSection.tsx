import ArticleCard from "./ArticleCard";
import { articleToCard } from "@/lib/mappers/articleMappers";
import type { ArticleWithRelations } from "@/lib/articleApi";

type Props = {
  articles: ArticleWithRelations[];
  title?: string;
};

// Spotlight-Section auf Kategorie-Pages und Homepage. Rendert bis zu N
// Featured-Cards in einer Grid. Wenn keine Articles vorhanden sind, wird
// die ganze Section nicht gerendert (return null).
export default function SpotlightSection({ articles, title = "Spotlight" }: Props) {
  if (articles.length === 0) return null;
  const cards = articles.map(articleToCard);

  return (
    <>
      <style>{`
        .sl-section {
          max-width: var(--max-content);
          margin: 0 auto;
          padding: var(--sp-10) var(--sp-8) 0;
        }
        .sl-header {
          display: flex; align-items: center; gap: var(--sp-3);
          margin-bottom: var(--sp-6);
          padding-bottom: var(--sp-3);
          border-bottom: 1px solid var(--da-border);
        }
        .sl-bar {
          width: 3px; height: 22px; background: var(--da-orange);
          border-radius: 2px;
        }
        .sl-h2 {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: var(--fs-h2); font-weight: 700;
          margin: 0;
        }
        .sl-tag {
          color: var(--da-orange);
          font-family: var(--da-font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-left: auto;
        }
        .sl-grid {
          display: grid;
          gap: var(--sp-4);
          grid-template-columns: repeat(var(--cols), 1fr);
        }
        @media (max-width: 900px) {
          .sl-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .sl-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <section className="sl-section">
        <header className="sl-header">
          <span className="sl-bar" />
          <h2 className="sl-h2">{title}</h2>
          <span className="sl-tag">Featured</span>
        </header>
        <div
          className="sl-grid"
          style={{ ["--cols" as string]: String(Math.min(cards.length, 3)) }}
        >
          {cards.map((c) => (
            <ArticleCard
              key={c.href}
              category={c.category}
              title={c.title}
              author={c.author}
              date={c.date}
              image={c.image}
              href={c.href}
              featured
              external={c.external}
            />
          ))}
        </div>
      </section>
    </>
  );
}
