import { forwardRef } from "react";
import { resolveTheme } from "@/lib/ads/creativeTheme";

// Reine Praesentations-Komponente (F4): dasselbe Karten-Markup fuer Auslieferung
// (ModuleSlot), Vorschau-Seite und Admin-Vorschau. Kein Fetch, kein State.
// Neutrale mod-*-Klassen. kind "image": Motiv innerhalb desselben <a> wie der
// Kicker (Diagnose B7) — Link-Attribute (sponsored/nofollow/_blank fuer
// Kunden) und "Anzeige"-Kennzeichnung bleiben identisch.
export type ModuleCardProps = {
  layout: "wide" | "stacked";
  kind?: "internal" | "image";
  isHouse: boolean;
  href: string;
  linkAttrs?: { target?: string; rel?: string };
  // Vorschau im Admin: nicht klickbar.
  preview?: boolean;
  // internal
  headline?: string | null;
  body?: string | null;
  ctaLabel?: string | null;
  theme?: string;
  bg?: string | null;
  // image
  src?: string;
  w?: number | null;
  h?: number | null;
  alt?: string;
  // above the fold (home_billboard): kein lazy loading.
  eager?: boolean;
  // Klick auf den Anker (Capture, kein preventDefault) — fuer das Zaehlen (J2).
  onActivate?: () => void;
};

// Ref zeigt auf das <a class="mod-inner"> — Ziel fuer den IntersectionObserver.
const ModuleCard = forwardRef<HTMLAnchorElement, ModuleCardProps>(function ModuleCard(props, ref) {
  const { layout, kind = "internal", isHouse, href, linkAttrs, preview, onActivate } = props;
  const anchorAttrs = preview ? {} : linkAttrs;
  const pe: React.CSSProperties = preview ? { pointerEvents: "none" } : {};
  const activate = onActivate ? { onClickCapture: () => onActivate() } : {};

  if (kind === "image") {
    return (
      <>
        <style>{`
          .mod-inner--image {
            display: flex; flex-direction: column; gap: 4px; width: 100%;
            padding: 0; background: transparent; border: 1px solid var(--da-border);
            border-radius: var(--r-md); overflow: hidden; text-decoration: none;
            align-self: flex-start; transition: border-color var(--t-fast);
          }
          .mod-inner--image:hover { border-color: var(--da-green); }
          .mod-inner--image .mod-kicker { color: var(--da-muted); padding: 6px 8px 0; }
          .mod-inner--image .mod-pic { display: block; width: 100%; height: auto; }
        `}</style>
        <a ref={ref} className={`mod-inner mod-inner--image mod-inner--${layout}`} style={pe} href={href} {...anchorAttrs} {...activate} aria-disabled={preview || undefined}>
          {!isHouse && <span className="mod-kicker da-overline">Anzeige</span>}
          {/* Plain <img>: Storage laeuft ohnehin unoptimized; Masse kommen aus der DB (kein CLS). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="mod-pic"
            src={props.src}
            alt={props.alt ?? ""}
            width={props.w ?? undefined}
            height={props.h ?? undefined}
            loading={props.eager ? "eager" : "lazy"}
            decoding="async"
            style={{ maxWidth: props.w ? `${props.w}px` : undefined }}
          />
        </a>
      </>
    );
  }

  const t = resolveTheme(props.theme ?? "card", props.bg);
  const cls = `mod-inner mod-inner--${layout}${t.flat ? " mod-inner--flat" : " mod-inner--card"}`;
  const style: React.CSSProperties = {
    background: t.background,
    color: t.color,
    ...(t.flat ? { borderColor: t.border } : {}),
    ...pe,
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
          .mod-inner--wide:not(.mod-inner--image) { flex-direction: row; align-items: center; justify-content: space-between; gap: var(--sp-6); }
          .mod-inner--wide .mod-cta {
            align-self: center; flex-shrink: 0; padding: 10px 16px;
            border: 1px solid var(--da-border); border-radius: var(--r-md);
            transition: border-color var(--t-fast);
          }
          .mod-inner--wide.mod-inner--flat .mod-cta { border-color: currentColor; }
          .mod-inner--wide.mod-inner--card:hover .mod-cta { border-color: var(--da-green); }
        }
      `}</style>
      <a ref={ref} className={cls} style={style} href={href} {...anchorAttrs} {...activate} aria-disabled={preview || undefined}>
        <span className="mod-text">
          {/* Bezahlte (Kunden-)Platzierung sichtbar als "Anzeige" kennzeichnen;
              House-Eigenwerbung braucht keine Kennzeichnung. */}
          {!isHouse && <span className="mod-kicker da-overline">Anzeige</span>}
          <span className="mod-title">{props.headline}</span>
          {props.body && <span className="mod-body">{props.body}</span>}
        </span>
        {props.ctaLabel && <span className="mod-cta">{props.ctaLabel} →</span>}
      </a>
    </>
  );
});

export default ModuleCard;
