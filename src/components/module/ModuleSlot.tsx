"use client";

import { useEffect, useId, useState } from "react";
import { PLACEMENTS, type PlacementCode } from "@/lib/ads/placements";

// Neutrale Benennung nach aussen (kein ad/banner/... in Klassen/Attributen/
// Pfad). Reserviert die KOMPAKTE Hoehe fuer typografische Kreative aus der
// Geometrie-Konstante (CLS-Schutz, D1), gibt sie bei leerer Antwort wieder
// frei. Spezifitaet haengt nur an r/a.
type Props = {
  code: PlacementCode;
  ressortSlug?: string;
  articleSlug?: string;
};

type ModuleData = {
  kind: string;
  isHouse: boolean;
  headline: string | null;
  body: string | null;
  ctaLabel: string | null;
  href: string;
};

type State = { phase: "loading" } | { phase: "empty" } | { phase: "ready"; data: ModuleData };

export default function ModuleSlot({ code, ressortSlug, articleSlug }: Props) {
  const { internalHeight, minViewport, layout } = PLACEMENTS[code];
  const id = useId().replace(/[:]/g, "");
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    const w = window.innerWidth;
    // Unter der Mindestbreite gar nicht laden. Kein synchrones setState im
    // Effect — der Slot bleibt in der reservierten Hoehe (bei den Rails
    // ohnehin per Media-Query ausgeblendet).
    if (minViewport && w < minViewport) return;
    const controller = new AbortController();
    const qs = new URLSearchParams({ v: String(w) });
    if (ressortSlug) qs.set("r", ressortSlug);
    if (articleSlug) qs.set("a", articleSlug);
    fetch(`/api/module/${code}?${qs.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : {}))
      .then((json: Partial<ModuleData>) => {
        if (json && json.kind && json.href) {
          setState({ phase: "ready", data: json as ModuleData });
        } else {
          setState({ phase: "empty" });
        }
      })
      .catch(() => setState({ phase: "empty" }));
    return () => controller.abort();
  }, [code, ressortSlug, articleSlug, minViewport]);

  // Leere Antwort -> nichts rendern, reservierte Hoehe freigeben.
  if (state.phase === "empty") return null;

  const cls = `mod-${id}`;
  const wide = layout === "wide";

  // E3: House = interner Link (kein rel, kein target). Kunde = bezahlt:
  // rel="sponsored nofollow noopener" + neuer Tab.
  const linkAttrs =
    state.phase === "ready" && !state.data.isHouse
      ? { target: "_blank", rel: "sponsored nofollow noopener" }
      : {};

  return (
    <div className={cls}>
      <style>{`
        .${cls} { min-height: ${internalHeight.desktop}px; display: flex; }
        @media (max-width: 767px) { .${cls} { min-height: ${internalHeight.mobile}px; } }
        .${cls} .mod-inner {
          flex: 1; display: flex; flex-direction: column; justify-content: flex-start;
          gap: var(--sp-3); padding: var(--sp-6); border-radius: var(--r-md);
          background: var(--da-card); border: 1px solid var(--da-border);
          text-decoration: none; transition: border-color var(--t-fast);
        }
        .${cls} .mod-inner:hover { border-color: var(--da-green); }
        .${cls} .mod-text { display: flex; flex-direction: column; gap: var(--sp-2); min-width: 0; }
        .${cls} .mod-kicker { color: var(--da-muted); }
        .${cls} .mod-title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: var(--fs-h4); font-weight: 700; line-height: 1.25;
        }
        .${cls} .mod-body { color: var(--da-muted); font-size: var(--fs-body); line-height: 1.5; }
        .${cls} .mod-cta {
          color: var(--da-green); font-family: var(--da-font-mono); font-size: var(--fs-body-sm);
          font-weight: 600; letter-spacing: 0.05em; white-space: nowrap; align-self: flex-start;
        }
        ${wide ? `
        @media (min-width: 768px) {
          .${cls} .mod-inner { flex-direction: row; align-items: center; justify-content: space-between; gap: var(--sp-6); }
          .${cls} .mod-cta {
            align-self: center; flex-shrink: 0;
            padding: 10px 16px; border: 1px solid var(--da-border); border-radius: var(--r-md);
            transition: border-color var(--t-fast), background var(--t-fast);
          }
          .${cls} .mod-inner:hover .mod-cta { border-color: var(--da-green); }
        }` : ""}
      `}</style>
      {state.phase === "ready" && state.data.kind === "internal" && (
        <a className="mod-inner" href={state.data.href} {...linkAttrs}>
          <span className="mod-text">
            {/* Bezahlte (Kunden-)Platzierung sichtbar als "Anzeige" kennzeichnen;
                House-Eigenwerbung braucht keine Kennzeichnung. */}
            {!state.data.isHouse && <span className="mod-kicker da-overline">Anzeige</span>}
            <span className="mod-title">{state.data.headline}</span>
            {state.data.body && <span className="mod-body">{state.data.body}</span>}
          </span>
          {state.data.ctaLabel && <span className="mod-cta">{state.data.ctaLabel} →</span>}
        </a>
      )}
    </div>
  );
}
