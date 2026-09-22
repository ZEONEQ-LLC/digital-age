import { resolveTheme } from "@/lib/ads/creativeTheme";

// Reine Praesentations-Komponente (F4): dasselbe Karten-Markup fuer Auslieferung
// (ModuleSlot) und Admin-Vorschau. Kein Fetch, kein State. Neutrale mod-*-Klassen.
export type ModuleCardProps = {
  layout: "wide" | "stacked";
  isHouse: boolean;
  headline: string | null;
  body: string | null;
  ctaLabel: string | null;
  href: string;
  theme: string;
  bg?: string | null;
  linkAttrs?: { target?: string; rel?: string };
  // Vorschau im Admin: nicht klickbar.
  preview?: boolean;
};

export default function ModuleCard({
  layout, isHouse, headline, body, ctaLabel, href, theme, bg, linkAttrs, preview,
}: ModuleCardProps) {
  const t = resolveTheme(theme, bg);
  const cls = `mod-inner mod-inner--${layout}${t.flat ? " mod-inner--flat" : " mod-inner--card"}`;
  const style: React.CSSProperties = {
    background: t.background,
    color: t.color,
    ...(t.flat ? { borderColor: t.border } : {}),
    ...(preview ? { pointerEvents: "none" } : {}),
  };
  return (
    <>
      <style>{`
        .mod-inner {
          flex: 1; display: flex; flex-direction: column; justify-content: flex-start;
          gap: var(--sp-3); padding: var(--sp-6); border-radius: var(--r-md);
          border: 1px solid var(--da-border); text-decoration: none;
          transition: border-color var(--t-fast), filter var(--t-fast);
        }
        .mod-inner--card:hover { border-color: var(--da-green); }
        .mod-inner--flat:hover { filter: brightness(1.06); }
        .mod-text { display: flex; flex-direction: column; gap: var(--sp-2); min-width: 0; }
        .mod-kicker { color: inherit; opacity: 0.7; }
        .mod-inner--card .mod-kicker { color: var(--da-muted); opacity: 1; }
        .mod-title { color: inherit; font-family: var(--da-font-display); font-size: var(--fs-h4); font-weight: 700; line-height: 1.25; }
        .mod-body { color: var(--da-muted); font-size: var(--fs-body); line-height: 1.5; }
        .mod-inner--flat .mod-body { color: inherit; opacity: 0.85; }
        .mod-cta {
          color: var(--da-green); font-family: var(--da-font-mono); font-size: var(--fs-body-sm);
          font-weight: 600; letter-spacing: 0.05em; white-space: nowrap; align-self: flex-start;
        }
        .mod-inner--flat .mod-cta { color: inherit; }
        @media (min-width: 768px) {
          .mod-inner--wide { flex-direction: row; align-items: center; justify-content: space-between; gap: var(--sp-6); }
          .mod-inner--wide .mod-cta {
            align-self: center; flex-shrink: 0; padding: 10px 16px;
            border: 1px solid var(--da-border); border-radius: var(--r-md);
            transition: border-color var(--t-fast);
          }
          .mod-inner--wide.mod-inner--flat .mod-cta { border-color: currentColor; }
          .mod-inner--wide.mod-inner--card:hover .mod-cta { border-color: var(--da-green); }
        }
      `}</style>
      <a className={cls} style={style} href={href} {...(preview ? {} : linkAttrs)} aria-disabled={preview || undefined}>
        <span className="mod-text">
          {/* Bezahlte (Kunden-)Platzierung sichtbar als "Anzeige" kennzeichnen;
              House-Eigenwerbung braucht keine Kennzeichnung. */}
          {!isHouse && <span className="mod-kicker da-overline">Anzeige</span>}
          <span className="mod-title">{headline}</span>
          {body && <span className="mod-body">{body}</span>}
        </span>
        {ctaLabel && <span className="mod-cta">{ctaLabel} →</span>}
      </a>
    </>
  );
}
