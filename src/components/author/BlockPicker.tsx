"use client";

import { useEffect, useRef, useState } from "react";
import type { BlockType } from "@/types/blocks";

const OPTIONS: { id: string; label: string; icon: string; insertType: BlockType; level?: 2 | 3 }[] = [
  { id: "heading-2", label: "Heading 2", icon: "H2", insertType: "heading", level: 2 },
  { id: "heading-3", label: "Heading 3", icon: "H3", insertType: "heading", level: 3 },
  { id: "paragraph", label: "Absatz",    icon: "¶",  insertType: "paragraph" },
  { id: "quote",     label: "Zitat",     icon: "❝",  insertType: "quote" },
  { id: "list",      label: "Liste",     icon: "•",  insertType: "list" },
  { id: "code",      label: "Code",      icon: "<>", insertType: "code" },
  { id: "image",     label: "Bild",      icon: "▢",  insertType: "image" },
];

type BlockPickerProps = {
  onPick: (type: BlockType, level?: 2 | 3) => void;
  variant?: "block" | "compact";
};

export default function BlockPicker({ onPick, variant = "block" }: BlockPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", marginTop: 8, marginBottom: 8 }}>
      {variant === "block" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            color: "var(--da-muted-soft)",
            border: "1px dashed var(--da-border)",
            borderRadius: 4,
            padding: "10px 14px",
            cursor: "pointer",
            fontSize: 12,
            width: "100%",
            justifyContent: "center",
            fontFamily: "inherit",
          }}
        >
          + Block hinzufügen
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Block hinzufügen"
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            background: "var(--da-dark)",
            border: "1px solid var(--da-border)",
            color: "var(--da-muted-soft)",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          +
        </button>
      )}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            zIndex: 20,
            background: "var(--da-card)",
            border: "1px solid var(--da-border)",
            borderRadius: 6,
            padding: 6,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 4,
            minWidth: 220,
          }}
        >
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onPick(o.insertType, o.level);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "transparent",
                color: "var(--da-text)",
                border: "none",
                padding: "8px 12px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
                textAlign: "left",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--da-dark)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--da-dark)",
                  borderRadius: 3,
                  fontSize: 11,
                  fontFamily: "var(--da-font-mono)",
                  color: "var(--da-green)",
                  fontWeight: 700,
                }}
              >
                {o.icon}
              </span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
