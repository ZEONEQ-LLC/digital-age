"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TextAlignment } from "@/types/blocks";

export type ToolbarTarget = HTMLTextAreaElement | HTMLInputElement;

type Props = {
  target: ToolbarTarget | null;
  onApply: (before: string, after: string) => void;
  onReset?: () => void;
  alignment?: TextAlignment;
  onSetAlignment?: (a: TextAlignment | undefined) => void;
  onOpenLink: () => void;
  onOpenInternalLink: () => void;
  onOpenSource?: () => void;
};

const ALIGN_ICONS: Record<TextAlignment, React.ReactNode> = {
  left: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="2" y1="3.5" x2="14" y2="3.5" />
      <line x1="2" y1="7" x2="10" y2="7" />
      <line x1="2" y1="10.5" x2="14" y2="10.5" />
      <line x1="2" y1="14" x2="10" y2="14" />
    </svg>
  ),
  center: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="2" y1="3.5" x2="14" y2="3.5" />
      <line x1="4" y1="7" x2="12" y2="7" />
      <line x1="2" y1="10.5" x2="14" y2="10.5" />
      <line x1="4" y1="14" x2="12" y2="14" />
    </svg>
  ),
  right: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="2" y1="3.5" x2="14" y2="3.5" />
      <line x1="6" y1="7" x2="14" y2="7" />
      <line x1="2" y1="10.5" x2="14" y2="10.5" />
      <line x1="6" y1="14" x2="14" y2="14" />
    </svg>
  ),
  justify: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="2" y1="3.5" x2="14" y2="3.5" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="2" y1="10.5" x2="14" y2="10.5" />
      <line x1="2" y1="14" x2="14" y2="14" />
    </svg>
  ),
};

const RESET_ICON = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4.5h12" />
    <path d="M5 4.5L7 12h2l2-7.5" />
    <line x1="3" y1="14" x2="13" y2="14" />
    <line x1="11.5" y1="2.5" x2="14" y2="5" />
    <line x1="14" y1="2.5" x2="11.5" y2="5" />
  </svg>
);

// Misst, wo die Selektion im Target visuell sitzt (oder fällt auf das obere
// Ende des Targets zurück). Wir mappen nicht jeden Char-Offset auf eine
// Pixel-Position — getBoundingClientRect des Targets reicht, weil Toolbars
// in dieser PR über dem ganzen Eingabefeld sitzen, nicht direkt über der
// Selektion.
function getToolbarPosition(target: ToolbarTarget): { left: number; top: number } {
  const rect = target.getBoundingClientRect();
  return {
    left: rect.left + rect.width / 2,
    top: rect.top - 8 + window.scrollY,
  };
}

export default function FloatingToolbar({
  target,
  onApply,
  onReset,
  alignment,
  onSetAlignment,
  onOpenLink,
  onOpenInternalLink,
  onOpenSource,
}: Props) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!target) {
      setPos(null);
      return;
    }
    setPos(getToolbarPosition(target));
    const onScroll = () => target && setPos(getToolbarPosition(target));
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [target]);

  if (!mounted || !pos) return null;

  const buttonStyle: React.CSSProperties = {
    background: "transparent",
    color: "var(--da-text)",
    border: "none",
    padding: "6px 8px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    borderRadius: 3,
  };

  function handleApply(before: string, after: string) {
    return (e: React.MouseEvent) => {
      // mousedown verhindert focus-loss vom Target → Selection bleibt aktiv.
      e.preventDefault();
      e.stopPropagation();
      onApply(before, after);
    };
  }

  function handleHyperlink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const raw = window.prompt("Link-URL:");
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    // Auto-Prefix https:// damit `www.google.com` nicht als relativer Pfad
    // interpretiert wird (→ /artikel/www.google.com → 404).
    const hasScheme = /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(trimmed);
    const url = hasScheme ? trimmed : `https://${trimmed}`;
    onApply(`[`, `](${url})`);
  }

  return createPortal(
    <div
      ref={ref}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "absolute",
        left: pos.left,
        top: pos.top,
        transform: "translate(-50%, -100%)",
        background: "var(--da-darker)",
        border: "1px solid var(--da-border)",
        borderRadius: 6,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        padding: 4,
        display: "flex",
        gap: 2,
        alignItems: "center",
        zIndex: 200,
        fontFamily: "var(--da-font-body)",
      }}
    >
      <button
        type="button"
        style={{ ...buttonStyle, fontWeight: 700 }}
        title="Fett (Cmd+B)"
        onMouseDown={handleApply("**", "**")}
      >
        B
      </button>
      <button
        type="button"
        style={{ ...buttonStyle, fontStyle: "italic" }}
        title="Kursiv (Cmd+I)"
        onMouseDown={handleApply("_", "_")}
      >
        I
      </button>

      {onSetAlignment && (
        <>
          <span style={{ width: 1, height: 18, background: "var(--da-border)", margin: "0 4px" }} />
          {(["left", "center", "right", "justify"] as const).map((a) => {
            const isActive = (alignment ?? "left") === a;
            const label =
              a === "left"
                ? "Linksbündig"
                : a === "center"
                  ? "Zentriert"
                  : a === "right"
                    ? "Rechtsbündig"
                    : "Blocksatz";
            return (
              <button
                key={a}
                type="button"
                style={{
                  ...buttonStyle,
                  background: isActive ? "rgba(50,255,126,0.20)" : "transparent",
                  color: isActive ? "var(--da-text)" : "var(--da-muted-soft)",
                  padding: "5px 7px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title={label}
                aria-pressed={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // left ist Default — speichern als `undefined` damit die
                  // Spalte clean bleibt. Andere Werte werden persistiert.
                  onSetAlignment(a === "left" ? undefined : a);
                }}
              >
                {ALIGN_ICONS[a]}
              </button>
            );
          })}
        </>
      )}

      <button
        type="button"
        style={buttonStyle}
        title="Hyperlink (Cmd+K)"
        onMouseDown={handleHyperlink}
      >
        ↗
      </button>
      <button
        type="button"
        style={buttonStyle}
        title="Verwandter Artikel"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenInternalLink();
        }}
      >
        ↳
      </button>

      <span style={{ width: 1, height: 18, background: "var(--da-border)", margin: "0 4px" }} />

      <button
        type="button"
        style={{ ...buttonStyle, background: "rgba(50,255,126,0.2)", color: "var(--da-text)", padding: "4px 8px" }}
        title="Highlight grün"
        onMouseDown={handleApply("{{g}}", "{{/g}}")}
      >
        ◼
      </button>
      <button
        type="button"
        style={{ ...buttonStyle, background: "rgba(255,140,66,0.2)", color: "var(--da-text)", padding: "4px 8px" }}
        title="Highlight orange"
        onMouseDown={handleApply("{{o}}", "{{/o}}")}
      >
        ◼
      </button>

      <span style={{ width: 1, height: 18, background: "var(--da-border)", margin: "0 4px" }} />

      <button
        type="button"
        style={{ ...buttonStyle, fontSize: 13 }}
        title="Schrift gross"
        onMouseDown={handleApply("{{lg}}", "{{/lg}}")}
      >
        Aa+
      </button>
      <button
        type="button"
        style={{ ...buttonStyle, fontSize: 15 }}
        title="Schrift XL"
        onMouseDown={handleApply("{{xl}}", "{{/xl}}")}
      >
        AA+
      </button>

      {onOpenSource && (
        <>
          <span style={{ width: 1, height: 18, background: "var(--da-border)", margin: "0 4px" }} />
          <button
            type="button"
            style={{ ...buttonStyle, fontSize: 12, fontFamily: "var(--da-font-mono)" }}
            title="Quelle einfügen (selektiere zuerst den Text)"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenSource();
            }}
          >
            [^]
          </button>
        </>
      )}

      {onReset && (
        <>
          <span style={{ width: 1, height: 18, background: "var(--da-border)", margin: "0 4px" }} />
          <button
            type="button"
            style={{ ...buttonStyle, color: "var(--da-muted-soft)", padding: "5px 7px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            title="Formatierung entfernen"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onReset();
            }}
          >
            {RESET_ICON}
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
