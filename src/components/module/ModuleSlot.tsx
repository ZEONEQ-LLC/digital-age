"use client";

import { useEffect, useId, useState } from "react";
import { PLACEMENTS, type PlacementCode } from "@/lib/ads/placements";
import ModuleCard from "./ModuleCard";

// Neutrale Benennung nach aussen (kein ad/banner/... in Klassen/Attributen/
// Pfad). Reserviert die Hoehe aus der Geometrie-Konstante (CLS-Schutz, D1):
// "internal" = Texthoehe, "image" = Bildhoehe — die Seite entscheidet das
// serverseitig ueber getSlotReservation (G3). Leere Antwort gibt die Hoehe
// wieder frei. Spezifitaet haengt nur an r/a. Karten-Markup: ModuleCard (F4).
// Vorschau (G5): ?vorschau=<token> in der URL wird als p mitgeschickt; kein
// useSearchParams, damit die ISR-Seiten nicht dynamisch werden (Diagnose C12).
// Breitenwechsel ueber die 768px-Grenze (Fenster gezogen, Telefon gedreht):
// Fetch mit der neuen Breite wiederholen, laufenden Request abbrechen.
export type SlotReserve = "image" | "internal";

type Props = {
  code: PlacementCode;
  ressortSlug?: string;
  articleSlug?: string;
  reserve?: SlotReserve;
};

type ModuleData =
  | {
      kind: "internal";
      isHouse: boolean;
      headline: string | null;
      body: string | null;
      ctaLabel: string | null;
      href: string;
      theme?: string;
      bg?: string;
      k?: string;
    }
  | {
      kind: "image";
      isHouse: boolean;
      src: string;
      w: number | null;
      h: number | null;
      alt: string;
      href: string;
      k?: string;
    };

type State = { phase: "loading" } | { phase: "empty" } | { phase: "ready"; data: ModuleData };

const TOKEN_RE = /^[0-9a-f]{48}$/;
const MOBILE_QUERY = "(max-width: 767px)";

export default function ModuleSlot({ code, ressortSlug, articleSlug, reserve = "internal" }: Props) {
  const { internalHeight, imageHeight, minViewport, layout } = PLACEMENTS[code];
  const height = reserve === "image" ? imageHeight : internalHeight;
  const id = useId().replace(/[:]/g, "");
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let controller: AbortController | null = null;

    const load = () => {
      const w = window.innerWidth;
      // Unter der Mindestbreite gar nicht laden. Kein synchrones setState im
      // Effect — der Slot bleibt in der reservierten Hoehe (bei den Rails
      // ohnehin per Media-Query ausgeblendet).
      if (minViewport && w < minViewport) return;
      controller?.abort();
      controller = new AbortController();
      const qs = new URLSearchParams({ v: String(w) });
      if (ressortSlug) qs.set("r", ressortSlug);
      if (articleSlug) qs.set("a", articleSlug);
      const preview = new URLSearchParams(window.location.search).get("vorschau");
      if (preview && TOKEN_RE.test(preview)) qs.set("p", preview);
      const signal = controller.signal;
      fetch(`/api/module/${code}?${qs.toString()}`, { signal, cache: "no-store" })
        .then((res) => (res.ok ? res.json() : {}))
        .then((json: Partial<ModuleData>) => {
          if (signal.aborted) return;
          if (json && json.kind && json.href) {
            setState({ phase: "ready", data: json as ModuleData });
          } else {
            setState({ phase: "empty" });
          }
        })
        .catch(() => { if (!signal.aborted) setState({ phase: "empty" }); });
    };

    load();

    // Nur ein Wechsel ueber die Grenze loest einen Refetch aus, nicht jede Breitenaenderung.
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => load();
    mql.addEventListener("change", onChange);
    return () => {
      mql.removeEventListener("change", onChange);
      controller?.abort();
    };
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
        .${cls} { min-height: ${height.desktop}px; display: flex; }
        @media (max-width: 767px) { .${cls} { min-height: ${height.mobile}px; } }
      `}</style>
      {state.phase === "ready" && state.data.kind === "image" && (
        <ModuleCard
          layout={layout}
          kind="image"
          isHouse={state.data.isHouse}
          href={state.data.href}
          src={state.data.src}
          w={state.data.w}
          h={state.data.h}
          alt={state.data.alt}
          eager={code === "home_billboard"}
          linkAttrs={linkAttrs}
        />
      )}
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
