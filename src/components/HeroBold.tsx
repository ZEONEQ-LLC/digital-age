import Image from "next/image";
import Link from "next/link";

export default function HeroBold() {
  return (
    <>
      <style>{`
        .hero-bold { position: relative; height: 92vh; min-height: 620px; overflow: hidden; }
        .hero-bold__img { object-fit: cover; }
        .hero-bold__overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(28,28,30,0.75) 0%, rgba(28,28,30,0.55) 50%, rgba(28,28,30,0.8) 100%);
        }
        .hero-bold__bottomfade {
          position: absolute; bottom: 0; left: 0; right: 0; height: 220px;
          background: linear-gradient(to top, var(--da-dark) 0%, transparent 100%);
          pointer-events: none;
        }
        .hero-bold__top {
          position: absolute; top: var(--sp-8); left: 0; right: 0;
          max-width: var(--max-content); margin: 0 auto;
          padding: 0 var(--sp-8);
          display: flex; justify-content: flex-end;
        }
        .hero-bold__date {
          color: rgba(255,255,255,0.4);
          font-size: var(--fs-meta);
          font-family: var(--da-font-mono);
          letter-spacing: 0.04em;
        }
        .hero-bold__center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 0 var(--sp-8);
        }
        .hero-bold__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: clamp(48px, 7.5vw, 96px);
          font-weight: 700;
          line-height: 1.0;
          letter-spacing: -0.03em;
          margin: 0;
          max-width: 12em;
        }
        .hero-bold__title-accent { color: var(--da-green); }
        .hero-bold__cta {
          position: absolute; bottom: 56px; left: 0; right: 0;
          max-width: var(--max-content); margin: 0 auto;
          padding: 0 var(--sp-8);
          display: flex; align-items: center; gap: var(--sp-6);
          flex-wrap: wrap;
        }
        .hero-bold__cta-primary {
          background: var(--da-green); color: var(--da-dark);
          font-size: var(--fs-body-lg); font-weight: 700;
          padding: 14px 32px; border-radius: var(--r-sm);
          white-space: nowrap;
          transition: filter var(--t-fast);
        }
        .hero-bold__cta-primary:hover { filter: brightness(1.08); }
        .hero-bold__cta-secondary {
          color: rgba(255,255,255,0.75);
          font-size: var(--fs-body); font-weight: 500;
          display: flex; align-items: center; gap: var(--sp-3);
          white-space: nowrap;
          transition: color var(--t-fast);
        }
        .hero-bold__cta-secondary:hover { color: var(--da-green); }
        .hero-bold__cta-secondary::before {
          content: ""; display: inline-block;
          width: 32px; height: 1px;
          background: rgba(255,255,255,0.4);
        }
        @media (max-width: 768px) {
          .hero-bold { height: 85svh; min-height: 560px; }
          .hero-bold__top { top: 20px; padding: 0 var(--sp-5); }
          .hero-bold__cta { bottom: 32px; padding: 0 var(--sp-5); flex-direction: column; align-items: stretch; gap: var(--sp-4); }
          .hero-bold__cta-primary { text-align: center; }
          .hero-bold__cta-secondary { justify-content: flex-start; }
        }
      `}</style>
      <section className="hero-bold">
        <Image
          src="/images/Hero-Bild-2.0.jpg"
          alt="digital age hero"
          fill
          priority
          sizes="100vw"
          className="hero-bold__img"
        />
        <div className="hero-bold__overlay" />

        <div className="hero-bold__top">
          <span className="hero-bold__date">APR 2026</span>
        </div>

        <div className="hero-bold__center">
          <h1 className="hero-bold__title">
            KI &amp; Future Tech für die <span className="hero-bold__title-accent">DACH-Region.</span>
          </h1>
        </div>

        <div className="hero-bold__bottomfade" />

        <div className="hero-bold__cta">
          <Link href="/ki-im-business" className="hero-bold__cta-primary">
            Jetzt lesen
          </Link>
          <Link href="/newsletter" className="hero-bold__cta-secondary">
            Newsletter abonnieren
          </Link>
        </div>
      </section>
    </>
  );
}
