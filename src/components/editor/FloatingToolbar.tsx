"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ToolbarTarget = HTMLTextAreaElement | HTMLInputElement;

type Props = {
  target: ToolbarTarget | null;
  onApply: (before: string, after: string) => void;
  onOpenLink: () => void;
  onOpenInternalLink: () => void;
  onOpenSource?: () => void;
};

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
    const url = window.prompt("Link-URL:");
    if (!url) return;
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
    </div>,
    document.body,
  );
}
