"use client";

import { useEffect, useId, useRef, useState } from "react";
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
// Zaehlen (J2-J5): sichtbare Einblendung = >= 50 % fuer 1 s ununterbrochen bei
// sichtbarem Tab, einmal pro Auslieferung; Klick = Klick auf den Anker. Beide
// als sendBeacon-POST mit dem Auslieferungs-Token k an denselben Pfad. Ohne k
// (kein Service-Key) oder in der Vorschau wird nichts gezaehlt. Keine
// Browser-Speicherung.
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

type State = { phase: "loading" } | { phase: "empty" } | { phase: "ready"; data: ModuleData; seq: number };

const TOKEN_RE = /^[0-9a-f]{48}$/;
const MOBILE_QUERY = "(max-width: 767px)";
const VIEW_MS = 1000;

function sendEvent(code: string, k: string, t: "v" | "c"): void {
  if (typeof navigator === "undefined" || navigator.webdriver) return;
  const url = `/api/module/${code}`;
  const body = JSON.stringify({ k, t });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))) return;
  } catch {
    // Fallback unten
  }
  fetch(url, { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
}

export default function ModuleSlot({ code, ressortSlug, articleSlug, reserve = "internal" }: Props) {
  const { internalHeight, imageHeight, minViewport, layout } = PLACEMENTS[code];
  const height = reserve === "image" ? imageHeight : internalHeight;
  const id = useId().replace(/[:]/g, "");
  const [state, setState] = useState<State>({ phase: "loading" });
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const seqRef = useRef(0);

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
            // Jede Auslieferung bekommt eine neue Sequenznummer -> neue Impression (Refetch).
            seqRef.current += 1;
            setState({ phase: "ready", data: json as ModuleData, seq: seqRef.current });
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

  // Sichtbare Einblendung zaehlen: Observer auf dem <a>, 50 % fuer 1 s, Tab sichtbar.
  const k = state.phase === "ready" ? state.data.k : undefined;
  const seq = state.phase === "ready" ? state.seq : 0;
  useEffect(() => {
    if (!k) return;
    const el = anchorRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer: number | null = null;
    let inView = false;
    let fired = false;
    const clear = () => { if (timer !== null) { window.clearTimeout(timer); timer = null; } };
    const arm = () => {
      if (fired || timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        if (fired || !inView || document.visibilityState !== "visible") return;
        fired = true;
        io.disconnect();
        sendEvent(code, k, "v");
      }, VIEW_MS);
    };
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      inView = !!e && e.isIntersecting && e.intersectionRatio >= 0.5;
      if (inView && document.visibilityState === "visible") arm(); else clear();
    }, { threshold: [0.5] });
    const onVis = () => {
      if (document.visibilityState === "visible") { if (inView) arm(); } else clear();
    };
    document.addEventListener("visibilitychange", onVis);
    io.observe(el);
    return () => {
      clear();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [k, seq, code]);

  // Leere Antwort -> nichts rendern, reservierte Hoehe freigeben.
  if (state.phase === "empty") return null;

  const cls = `mod-${id}`;

  // E3: House = interner Link (kein rel, kein target). Kunde = bezahlt:
  // rel="sponsored nofollow noopener" + neuer Tab.
  const linkAttrs =
    state.phase === "ready" && !state.data.isHouse
      ? { target: "_blank", rel: "sponsored nofollow noopener" }
      : {};
  const onActivate = k ? () => sendEvent(code, k, "c") : undefined;

  return (
    <div className={cls}>
      <style>{`
        .${cls} { min-height: ${height.desktop}px; display: flex; }
        @media (max-width: 767px) { .${cls} { min-height: ${height.mobile}px; } }
      `}</style>
      {state.phase === "ready" && state.data.kind === "image" && (
        <ModuleCard
          ref={anchorRef}
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
          onActivate={onActivate}
        />
      )}
      {state.phase === "ready" && state.data.kind === "internal" && (
        <ModuleCard
          ref={anchorRef}
          layout={layout}
          isHouse={state.data.isHouse}
          headline={state.data.headline}
          body={state.data.body}
          ctaLabel={state.data.ctaLabel}
          href={state.data.href}
          theme={state.data.theme ?? "card"}
          bg={state.data.bg}
          linkAttrs={linkAttrs}
          onActivate={onActivate}
        />
      )}
    </div>
  );
}
