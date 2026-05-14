"use client";

import { useRef, useState } from "react";
import FloatingToolbar, { type ToolbarTarget } from "./FloatingToolbar";
import type { ArticleSearchResult } from "@/lib/articleSearchActions";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onRequestArticlePick?: (onPick: (r: ArticleSearchResult) => void) => void;
  onRequestSourcePick?: (insertMarker: (n: number) => void) => void;
  rows?: number;
  style?: React.CSSProperties;
  placeholder?: string;
};

// Textarea mit FloatingToolbar bei Selektion. Toolbar setzt Marker um die
// aktuelle Selektion herum (Markdown + Custom-Marker für Highlight/Size).
export default function InlineToolbarTextarea({
  value,
  onChange,
  onRequestArticlePick,
  onRequestSourcePick,
  rows = 3,
  style,
  placeholder,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  function track() {
    const el = ref.current;
    if (!el) return;
    setHasSelection(el.selectionStart !== el.selectionEnd);
  }

  function apply(before: string, after: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const v = el.value;
    const next = v.slice(0, start) + before + v.slice(start, end) + after + v.slice(end);
    onChange(next);
    // Selektion auf den eingefügten Inhalt halten — feels-right für
    // sequenzielle Toolbar-Klicks (z.B. Bold + Italic auf gleichem Range).
    requestAnimationFrame(() => {
      const el2 = ref.current;
      if (!el2) return;
      el2.focus();
      const newStart = start + before.length;
      const newEnd = end + before.length;
      el2.setSelectionRange(newStart, newEnd);
      setHasSelection(true);
    });
  }

  return (
    <>
      <textarea
        ref={ref}
        rows={rows}
        style={style}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onSelect={track}
        onKeyUp={track}
        onMouseUp={track}
        onBlur={() => {
          // Toolbar dranlassen wenn Maus drauf — ein onMouseDown in der
          // Toolbar verhindert den Blur durch preventDefault. Hier räumen
          // wir nur auf, falls Selektion durch Tastatur etc. weggeht.
          setTimeout(() => {
            const el = ref.current;
            if (!el || document.activeElement !== el) setHasSelection(false);
          }, 100);
        }}
      />
      {hasSelection && (
        <FloatingToolbar
          target={ref.current as ToolbarTarget}
          onApply={apply}
          onOpenLink={() => {}}
          onOpenInternalLink={() => {
            if (!onRequestArticlePick) return;
            onRequestArticlePick((result) => {
              apply(`[[${result.slug}]](`, `)`);
            });
          }}
          onOpenSource={
            onRequestSourcePick
              ? () => {
                  onRequestSourcePick((n) => {
                    apply("", `[^${n}]`);
                  });
                }
              : undefined
          }
        />
      )}
    </>
  );
}
