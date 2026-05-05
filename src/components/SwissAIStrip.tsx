import Link from "next/link";

export type SwissAIItem = {
  name: string;
  city: string;
  industry: string;
  href?: string;
};

type SwissAIStripProps = {
  items: SwissAIItem[];
  href?: string;
};

export default function SwissAIStrip({ items, href = "/swiss-ai" }: SwissAIStripProps) {
  return (
    <>
      <style>{`
        .swiss-section { max-width: var(--max-content); margin: 0 auto; padding: var(--sp-16) var(--sp-8) 0; }
        .swiss-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: var(--sp-6);
          padding-bottom: var(--sp-4);
          border-bottom: 1px solid var(--da-border);
        }
        .swiss-header__title { display: flex; align-items: center; gap: var(--sp-3); }
        .swiss-header__bar { width: 3px; height: 24px; background: var(--da-green); border-radius: 2px; }
        .swiss-header__h2 {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: var(--fs-h2); font-weight: 700;
          margin: 0;
        }
        .swiss-header__more {
          color: var(--da-green);
          font-size: var(--fs-body-sm); font-weight: 600;
        }
        .swiss-strip {
          display: flex; gap: var(--sp-3);
          overflow-x: auto; padding-bottom: var(--sp-2);
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }
        .swiss-card {
          flex-shrink: 0; min-width: 200px; max-width: 220px;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: var(--r-lg);
          padding: var(--sp-5) var(--sp-6);
          transition: border-color var(--t-base), transform var(--t-base);
        }
        .swiss-card:hover { border-color: var(--da-green); transform: translateY(-2px); }
        .swiss-card__tag {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: var(--fs-caption);
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: var(--sp-2);
        }
        .swiss-card__name {
          color: var(--da-text);
          font-size: 17px; font-weight: 700;
          margin-bottom: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .swiss-card__meta {
          color: var(--da-muted);
          font-size: var(--fs-meta);
          font-family: var(--da-font-mono);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        @media (max-width: 640px) {
          .swiss-section { padding: var(--sp-10) var(--sp-5) 0; }
        }
      `}</style>
      <section className="swiss-section">
        <header className="swiss-header">
          <div className="swiss-header__title">
            <span className="swiss-header__bar" />
            <h2 className="swiss-header__h2">🇨🇭 Swiss AI Spotlight</h2>
          </div>
          <Link href={href} className="swiss-header__more">Alle ansehen →</Link>
        </header>

        <div className="swiss-strip">
          {items.map((item) => (
            <Link key={item.name} href={item.href ?? href} className="swiss-card">
              <div className="swiss-card__tag">🇨🇭 Swiss Based</div>
              <div className="swiss-card__name">{item.name}</div>
              <div className="swiss-card__meta">{item.industry} · {item.city}</div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
