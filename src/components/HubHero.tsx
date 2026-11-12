import type { ReactNode } from "react";

// Einheitlicher Kopf der sechs Rubriken (KI im Business, Future Tech,
// KI-Plattformen, AI Prompts, Podcasts, Swiss AI), Backlog-Karte «Hub-Header
// vereinheitlichen», Entscheid Ali 12.11.2026 (Empfehlungen der Karte).
//
// Kopfzeile mit «>», grosser Titel mit optionalem Akzentwort (<em>), Lead,
// Zahlenzeile und optional ein Element rechts (Knopf, Legende). Hintergrund:
// Punkteraster in der Akzentfarbe. Keine Hooks, kein "use client": rendert in
// Server- und Client-Baeumen und liegt immer ausserhalb von Suspense, damit
// H1 und Lead im statischen HTML stehen (SEO N1).

export type HubStat = { value: string | number; label: string };

type Props = {
  overline: string;
  title: ReactNode;
  lead: ReactNode;
  stats?: HubStat[];
  right?: ReactNode;
  // CSS-Farbe des Akzents, z. B. var(--da-green) oder var(--da-purple).
  accent?: string;
  // Seitenrand unter 720 px, gleich wie der Inhalt der Seite darunter
  // (die Rubriken nutzen 20, 24 oder 32 px). Desktop immer sp-8.
  mobileInset?: string;
};

const CSS = `
  .hh { position: relative; overflow: hidden; border-bottom: 1px solid var(--da-border); padding: 56px 0 48px; }
  .hh__dots {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.16;
    background-image: radial-gradient(var(--hub-accent) 1px, transparent 1.4px);
    background-size: 22px 22px;
    -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 55%, #000 100%);
    mask-image: linear-gradient(to right, transparent 0%, #000 55%, #000 100%);
  }
  /* Horizontaler Abstand innen: Text fluchtet mit dem Inhalt darunter
     (max-content + sp-8 wie Spotlight, Listen und Verzeichnisse). */
  .hh__inner { position: relative; max-width: var(--max-content); margin: 0 auto; padding: 0 var(--sp-8); }
  .hh__overline {
    color: var(--hub-accent); font-family: var(--da-font-mono); font-size: 11px; font-weight: 700;
    letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 14px;
  }
  .hh__row { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: var(--sp-6); }
  .hh__main { min-width: 0; flex: 1 1 520px; }
  .hh__title {
    color: var(--da-text); font-family: var(--da-font-display); font-size: clamp(36px, 5vw, 56px);
    font-weight: 700; line-height: 1.0; letter-spacing: -0.02em; margin: 0 0 var(--sp-4);
  }
  .hh__title em { font-style: normal; color: var(--hub-accent); }
  .hh__lead { color: var(--da-muted); font-size: 17px; line-height: 1.65; max-width: 640px; margin: 0; }
  .hh__stats {
    display: flex; gap: 8px 0; flex-wrap: wrap; margin-top: 20px;
    color: var(--da-muted-soft); font-family: var(--da-font-mono); font-size: 12px; font-weight: 600;
  }
  .hh__stats strong { color: var(--da-text); font-weight: 700; }
  .hh__stat + .hh__stat::before { content: "·"; margin: 0 14px; color: var(--da-faint); }
  .hh__right { flex: 0 0 auto; }
  @media (max-width: 720px) {
    .hh { padding: 40px 0 32px; }
    .hh__inner { padding: 0 var(--hub-inset-m, var(--sp-5)); }
    .hh__lead { font-size: 16px; }
    /* Mobil ohne Trennpunkte: Beim Umbruch stuende sonst ein Punkt vorne. */
    .hh__stats { gap: 6px 18px; }
    .hh__stat + .hh__stat::before { content: none; }
  }
`;

export default function HubHero({ overline, title, lead, stats = [], right, accent = "var(--da-green)", mobileInset }: Props) {
  return (
    <section
      className="hh"
      style={{ ["--hub-accent" as string]: accent, ...(mobileInset ? { ["--hub-inset-m" as string]: mobileInset } : {}) }}
    >
      <style>{CSS}</style>
      <div className="hh__dots" aria-hidden />
      <div className="hh__inner">
        <p className="hh__overline">&gt; {overline}</p>
        <div className="hh__row">
          <div className="hh__main">
            <h1 className="hh__title">{title}</h1>
            <p className="hh__lead">{lead}</p>
            {stats.length > 0 && (
              <div className="hh__stats">
                {stats.map((s) => (
                  <span key={s.label} className="hh__stat">
                    <strong>{s.value}</strong> {s.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          {right && <div className="hh__right">{right}</div>}
        </div>
      </div>
    </section>
  );
}
