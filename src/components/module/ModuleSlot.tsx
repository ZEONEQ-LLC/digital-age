"use client";

import { useEffect, useId, useState } from "react";
import { PLACEMENTS, type PlacementCode } from "@/lib/ads/placements";

// Neutrale Benennung nach aussen (kein ad/banner/... in Klassen/Attributen/
// Pfad). Reserviert die Hoehe SOFORT aus der Geometrie-Konstante (CLS-Schutz),
// gibt sie bei leerer Antwort wieder frei. Spezifitaet haengt nur an r/a.
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
  const { desktopHeight, mobileHeight, minViewport } = PLACEMENTS[code];
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

  // E3: House = interner Link (kein rel, kein target). Kunde = bezahlt:
  // rel="sponsored nofollow noopener" + neuer Tab.
  const linkAttrs =
    state.phase === "ready" && !state.data.isHouse
      ? { target: "_blank", rel: "sponsored nofollow noopener" }
      : {};

  return (
    <div className={cls}>
      <style>{`
        .${cls} { min-height: ${desktopHeight}px; display: flex; }
        @media (max-width: 767px) { .${cls} { min-height: ${mobileHeight}px; } }
        .${cls} .mod-inner {
          flex: 1; display: flex; flex-direction: column; justify-content: center;
          gap: 8px; padding: 20px; border-radius: var(--r-md, 8px);
          background: var(--da-card); border: 1px solid var(--da-border);
          text-decoration: none; transition: border-color var(--t-fast, 150ms);
        }
        .${cls} .mod-inner:hover { border-color: var(--da-green); }
        .${cls} .mod-kicker { color: var(--da-muted); }
        .${cls} .mod-title {
          color: var(--da-text); font-family: var(--da-font-display, inherit);
          font-size: 18px; font-weight: 700; line-height: 1.25;
        }
        .${cls} .mod-body { color: var(--da-muted); font-size: 14px; line-height: 1.5; }
        .${cls} .mod-cta {
          margin-top: 4px; align-self: flex-start; color: var(--da-green);
          font-family: var(--da-font-mono, monospace); font-size: 12px; font-weight: 700;
          letter-spacing: 0.04em;
        }
      `}</style>
      {state.phase === "ready" && state.data.kind === "internal" && (
        <a className="mod-inner" href={state.data.href} {...linkAttrs}>
          {/* Bezahlte (Kunden-)Platzierung sichtbar als "Anzeige" kennzeichnen;
              House-Eigenwerbung braucht keine Kennzeichnung. */}
          {!state.data.isHouse && <span className="mod-kicker da-overline">Anzeige</span>}
          <span className="mod-title">{state.data.headline}</span>
          {state.data.body && <span className="mod-body">{state.data.body}</span>}
          {state.data.ctaLabel && <span className="mod-cta">{state.data.ctaLabel} →</span>}
        </a>
      )}
    </div>
  );
}
