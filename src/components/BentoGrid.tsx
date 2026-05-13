import Link from "next/link";
import BentoCard, { type BentoArticle } from "./BentoCard";

type BentoGridProps = {
  articles: BentoArticle[];
  href: string;
};

export default function BentoGrid({ articles, href }: BentoGridProps) {
  // Layout slots:
  //   [0] = large top-left (2 cols × 1 row)
  //   [1] = right column upper
  //   [2] = right column lower
  //   [3] = bottom-left
  //   [4] = bottom-middle (optional — if absent, slot-3 spans the full bottom row)
  const a = articles;
  const hasFourth = !!a[4];

  return (
    <>
      <style>{`
        .bento-section { max-width: var(--max-content); margin: 0 auto; padding: var(--sp-16) var(--sp-8) 0; }
        .bento-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: var(--sp-8);
          padding-bottom: var(--sp-4);
          border-bottom: 1px solid var(--da-border);
        }
        .bento-header__title { display: flex; align-items: center; gap: var(--sp-3); }
        .bento-header__bar { width: 3px; height: 24px; background: var(--da-green); border-radius: 2px; }
        .bento-header__h2 {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: var(--fs-h2); font-weight: 700;
          margin: 0;
        }
        .bento-header__more {
          color: var(--da-green);
          font-size: var(--fs-body-sm); font-weight: 600;
          letter-spacing: 0.05em;
        }
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: 340px 260px;
          gap: var(--sp-4);
        }
        .bento-grid__slot-0 { grid-column: 1 / 3; grid-row: 1 / 2; }
        .bento-grid__slot-right {
          grid-column: 3 / 4; grid-row: 1 / 3;
          display: flex; flex-direction: column; gap: var(--sp-4);
        }
        .bento-grid__slot-3 { grid-column: 1 / 2; grid-row: 2 / 3; }
        .bento-grid__slot-4 { grid-column: 2 / 3; grid-row: 2 / 3; }
        .bento-grid--no-fourth .bento-grid__slot-3 { grid-column: 1 / 3; }
        @media (max-width: 1024px) {
          .bento-grid {
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: 320px 240px 240px;
          }
          .bento-grid__slot-0 { grid-column: 1 / 3; grid-row: 1 / 2; }
          .bento-grid__slot-right {
            grid-column: 1 / 3; grid-row: 2 / 3;
            display: grid; grid-template-columns: 1fr 1fr; flex-direction: row;
          }
          .bento-grid__slot-3 { grid-column: 1 / 2; grid-row: 3 / 4; }
          .bento-grid__slot-4 { grid-column: 2 / 3; grid-row: 3 / 4; }
        }
        @media (max-width: 640px) {
          .bento-section { padding: var(--sp-10) var(--sp-5) 0; }
          .bento-grid {
            grid-template-columns: 1fr;
            grid-template-rows: repeat(5, 240px);
            gap: var(--sp-3);
          }
          .bento-grid__slot-0 { grid-column: 1; grid-row: 1; }
          .bento-grid__slot-right {
            grid-column: 1; grid-row: 2 / 4;
            display: contents;
          }
          .bento-grid__slot-right > :nth-child(1) { grid-column: 1; grid-row: 2; }
          .bento-grid__slot-right > :nth-child(2) { grid-column: 1; grid-row: 3; }
          .bento-grid__slot-3 { grid-column: 1; grid-row: 4; }
          .bento-grid__slot-4 { grid-column: 1; grid-row: 5; }
        }
      `}</style>
      <section className="bento-section">
        <header className="bento-header">
          <div className="bento-header__title">
            <span className="bento-header__bar" />
            <h2 className="bento-header__h2">Featured</h2>
          </div>
          <Link href={href} className="bento-header__more">mehr →</Link>
        </header>

        <div className={`bento-grid${hasFourth ? "" : " bento-grid--no-fourth"}`}>
          <div className="bento-grid__slot-0">
            <BentoCard article={a[0]} size="lg" accent="green" />
          </div>
          <div className="bento-grid__slot-right">
            <BentoCard article={a[1]} size="md" accent="orange" />
            <BentoCard article={a[2]} size="md" accent="green" />
          </div>
          <div className="bento-grid__slot-3">
            <BentoCard article={a[3]} size="sm" accent="orange" />
          </div>
          {hasFourth && (
            <div className="bento-grid__slot-4">
              <BentoCard article={a[4]} size="sm" accent="green" />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
