"use client";

import { useState } from "react";

// Kopieren-Knopf im Teil-Kit. Faellt die Zwischenablage aus (alter Browser,
// kein https), bleibt der Text sichtbar und markierbar.
export default function KitCopy({ text, label = "Kopieren" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2200);
  };
  return (
    <button type="button" className="kit-copy" onClick={copy} aria-live="polite">
      {state === "done" ? "Kopiert" : state === "failed" ? "Bitte von Hand markieren" : label}
    </button>
  );
}
