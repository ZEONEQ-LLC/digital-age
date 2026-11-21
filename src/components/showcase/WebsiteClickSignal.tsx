"use client";

import { useEffect } from "react";

import { isCompanyLink } from "@/lib/showcase/kit";
import { signalReadAction } from "@/lib/stats/reading";

// Showcase S4: meldet dem Zaehler (ReadingMeter) einen Klick auf einen Link
// zur Website des Unternehmens, egal wo im Beitrag er steht (Kasten «Über das
// Unternehmen», Text, Quellen). Der Zaehler nimmt hoechstens einen pro
// Aufruf an. Rendert nichts, nie in der Vorschau eingehaengt.
export default function WebsiteClickSignal({ host }: { host: string }) {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (target && isCompanyLink((target as HTMLAnchorElement).href, host)) signalReadAction("website");
    };
    // auxclick: Mittelklick oeffnet in neuem Tab, ohne click auszuloesen.
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("auxclick", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("auxclick", onClick, { capture: true });
    };
  }, [host]);
  return null;
}
