"use client";

import { useEffect, useId, useState } from "react";
import { PLACEMENTS, type PlacementCode } from "@/lib/ads/placements";
import ModuleCard from "./ModuleCard";

// Neutrale Benennung nach aussen (kein ad/banner/... in Klassen/Attributen/
// Pfad). Reserviert die KOMPAKTE Hoehe fuer typografische Kreative aus der
// Geometrie-Konstante (CLS-Schutz, D1), gibt sie bei leerer Antwort wieder
// frei. Spezifitaet haengt nur an r/a. Karten-Markup: ModuleCard (F4).
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
  theme?: string;
  bg?: string;
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
      `}</style>
      {state.phase === "ready" && state.data.kind === "internal" && (
        <ModuleCard
          layout={layout}
          isHouse={state.data.isHouse}
          headline={state.data.headline}
          body={state.data.body}
          ctaLabel={state.data.ctaLabel}
          href={state.data.href}
          theme={state.data.theme ?? "card"}
          bg={state.data.bg}
          linkAttrs={linkAttrs}
        />
      )}
    </div>
  );
}
