// Markenband der Startseite (Design-Check 12.11.2026, Entscheid Ali: «mit
// Slogan-Band»): der Claim als H1 in einem schmalen Band statt des
// bildfuellenden Heros, rechts das heutige Datum. Darunter beginnen sofort
// Aufmacher und News. Das Hero-Bild bleibt als leiser Hintergrund rechts.
import Image from "next/image";

function todayLabel(): string {
  return new Date().toLocaleDateString("de-CH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich",
  });
}

export default function HomeDateline() {
  return (
    <section className="hb">
      <style>{`
        .hb { position: relative; overflow: hidden; border-bottom: 1px solid var(--da-border); background: var(--da-dark); }
        .hb__bg { position: absolute; top: 0; right: 0; bottom: 0; width: 55%; opacity: 0.22; pointer-events: none;
          -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 60%); mask-image: linear-gradient(to right, transparent 0%, #000 60%); }
        .hb__bg img { object-fit: cover; object-position: center 35%; }
        .hb__wrap { position: relative; max-width: var(--max-content); margin: 0 auto; padding: 34px var(--gutter) 30px;
          display: flex; align-items: flex-end; justify-content: space-between; gap: 10px 32px; flex-wrap: wrap; min-height: 120px; box-sizing: border-box; }
        .hb__claim { color: var(--da-text); font-family: var(--da-font-display); font-size: clamp(28px, 3.4vw, 42px); font-weight: 700;
          line-height: 1.05; letter-spacing: -0.025em; margin: 0; }
        .hb__claim em { font-style: normal; color: var(--da-green); }
        .hb__date { color: var(--da-muted); font-family: var(--da-font-mono); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; padding-bottom: 6px; }
        @media (max-width: 640px) {
          .hb__bg { width: 100%; opacity: 0.14; }
          .hb__wrap { padding: 22px var(--gutter) 18px; min-height: 0; align-items: flex-start; flex-direction: column; gap: 8px; }
          .hb__claim { font-size: 26px; }
          .hb__date { font-size: 11px; padding-bottom: 0; }
        }
      `}</style>
      <div className="hb__bg" aria-hidden>
        <Image src="/images/Hero-Bild-2.0.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 55vw" />
      </div>
      <div className="hb__wrap">
        <h1 className="hb__claim">KI &amp; Future Tech für die <em>DACH-Region.</em></h1>
        <span className="hb__date">{todayLabel()}</span>
      </div>
    </section>
  );
}
