import type { ReactNode } from "react";

// Kopf der sechs Rubriken (KI & Business, Future Tech, KI-Plattformen,
// AI Prompts, Podcasts, Swiss AI). Entscheid Ali 12.11.2026: Variante B
// «Kompaktzeile» nach dem Vergleich mit Wired, The Verge, TechCrunch, Ars
// Technica und NZZ: Rubriken zeigen dort den Namen und kaum Text, der erste
// Inhalt steht frueh im Bild.
//
// Eine Zeile: Akzentbalken, Rubrikname (H1), «// Claim» in einem Satz, rechts
// optional eine Aktion (Knopf, Legende). Der Balken nimmt das Motiv der
// Abschnittsueberschriften auf, der Name ist deutlich groesser. Keine Hooks,
// kein "use client": rendert in Server- und Client-Baeumen und liegt immer
// ausserhalb von Suspense, damit die H1 im statischen HTML steht (SEO N1).

type Props = {
  title: string;
  claim?: string;
  action?: ReactNode;
  // CSS-Farbe des Akzents, z. B. var(--da-green) oder var(--da-purple).
  accent?: string;
  // Seitenrand unter 720 px wie der Inhalt darunter (20, 24 oder 32 px).
  mobileInset?: string;
};

const CSS = `
  .hh { border-bottom: 1px solid var(--da-border); }
  .hh__wrap { max-width: var(--max-content); margin: 0 auto; padding: 0 var(--sp-8); }
  .hh__row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 24px; padding: 38px 0 32px; }
  .hh__head { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .hh__bar { width: 4px; height: 38px; border-radius: 2px; background: var(--hub-accent); flex-shrink: 0; }
  .hh__title {
    color: var(--da-text); font-family: var(--da-font-display); font-size: 42px; font-weight: 700;
    line-height: 1; letter-spacing: -0.02em; margin: 0; white-space: nowrap;
  }
  .hh__claim { color: var(--da-muted); font-size: 16px; line-height: 1.45; margin: 4px 0 0; max-width: 560px; }
  .hh__slash { color: var(--hub-accent); font-family: var(--da-font-mono); font-weight: 700; letter-spacing: -0.04em; margin-right: 8px; }
  .hh__action { margin-left: auto; display: flex; align-items: center; }
  /* Aktionen im Kopf: ruhig, Umriss statt Flaeche. */
  .hh-btn {
    display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; cursor: pointer;
    border: 1px solid var(--da-border); border-radius: var(--r-sm); background: transparent;
    color: var(--da-muted); font-family: var(--da-font-body); font-size: 13px; font-weight: 600;
    padding: 8px 14px; text-decoration: none; transition: color var(--t-base), border-color var(--t-base), background-color var(--t-base);
  }
  .hh-btn:hover { color: var(--da-text); border-color: var(--da-muted-soft); }
  .hh-btn--accent { color: var(--hub-accent, var(--da-green)); border-color: var(--hub-accent, var(--da-green)); }
  .hh-btn--accent:hover { background: var(--hub-accent, var(--da-green)); color: var(--da-dark); border-color: var(--hub-accent, var(--da-green)); }
  @media (max-width: 720px) {
    .hh__wrap { padding: 0 var(--hub-inset-m, var(--sp-5)); }
    .hh__row { padding: 26px 0 22px; gap: 10px 16px; }
    .hh__bar { height: 28px; }
    .hh__title { font-size: 30px; white-space: normal; }
    .hh__claim { flex-basis: 100%; font-size: 15px; margin: 0; padding-left: 18px; }
    .hh__action { margin-left: 18px; }
  }
`;

export default function HubHero({ title, claim, action, accent = "var(--da-green)", mobileInset }: Props) {
  const style = { ["--hub-accent" as string]: accent, ...(mobileInset ? { ["--hub-inset-m" as string]: mobileInset } : {}) };
  return (
    <section className="hh" style={style}>
      <style>{CSS}</style>
      <div className="hh__wrap">
        <div className="hh__row">
          <div className="hh__head">
            <span className="hh__bar" aria-hidden />
            <h1 className="hh__title">{title}</h1>
          </div>
          {claim && (
            <p className="hh__claim">
              <span className="hh__slash" aria-hidden>{"//"}</span>
              {claim}
            </p>
          )}
          {action && <div className="hh__action">{action}</div>}
        </div>
      </div>
    </section>
  );
}
