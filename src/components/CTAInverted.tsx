import Link from "next/link";

export default function CTAInverted() {
  return (
    <>
      <style>{`
        .cta-inv { background: var(--da-green); margin: var(--sp-20) 0 0; padding: 72px var(--sp-8); }
        .cta-inv__inner {
          max-width: var(--max-content); margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: var(--sp-8);
        }
        .cta-inv__overline {
          color: var(--da-dark);
          font-family: var(--da-font-mono);
          font-size: var(--fs-meta); font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          margin-bottom: var(--sp-3);
          opacity: 0.6;
        }
        .cta-inv__title {
          color: var(--da-dark);
          font-family: var(--da-font-display);
          font-size: clamp(28px, 4vw, 44px);
          font-weight: 700; line-height: 1.1;
          letter-spacing: -0.01em;
          max-width: 600px;
          margin: 0;
        }
        .cta-inv__btn {
          background: var(--da-dark); color: var(--da-green);
          font-size: var(--fs-body-lg); font-weight: 700;
          padding: 18px 40px; border-radius: var(--r-sm);
          white-space: nowrap;
          transition: filter var(--t-fast);
        }
        .cta-inv__btn:hover { filter: brightness(1.15); }
        @media (max-width: 768px) {
          .cta-inv { padding: var(--sp-12) var(--sp-5); margin-top: var(--sp-12); }
          .cta-inv__inner { flex-direction: column; align-items: flex-start; gap: var(--sp-6); }
          .cta-inv__btn { width: 100%; text-align: center; }
        }
      `}</style>
      <section className="cta-inv">
        <div className="cta-inv__inner">
          <div>
            <p className="cta-inv__overline">Content-Partner werden</p>
            <h2 className="cta-inv__title">
              Dein Wissen. Unsere Reichweite. Gemeinsam die DACH-Region.
            </h2>
          </div>
          <Link href="/kontakt" className="cta-inv__btn">
            Jetzt Publizieren →
          </Link>
        </div>
      </section>
    </>
  );
}
