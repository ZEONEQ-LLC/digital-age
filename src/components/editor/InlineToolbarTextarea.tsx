"use client";

import { useLayoutEffect, useRef, useState } from "react";
import FloatingToolbar, { type ToolbarTarget } from "./FloatingToolbar";
import type { ArticleSearchResult } from "@/lib/articleSearchActions";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onRequestArticlePick?: (onPick: (r: ArticleSearchResult) => void) => void;
  onRequestSourcePick?: (insertMarker: (n: number) => void) => void;
  alignment?: import("@/types/blocks").TextAlignment;
  onSetAlignment?: (a: import("@/types/blocks").TextAlignment | undefined) => void;
  rows?: number;
  style?: React.CSSProperties;
  placeholder?: string;
};

// Inline-Wrap-Marker-Paare, die durch die FloatingToolbar gesetzt werden
// können. Reihenfolge des Arrays bestimmt nur die Iteration; die Wraps
// selbst werden anhand der (before, after)-Tupel identifiziert.
const WRAP_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["**", "**"],
  ["_", "_"],
  ["{{g}}", "{{/g}}"],
  ["{{o}}", "{{/o}}"],
  ["{{lg}}", "{{/lg}}"],
  ["{{xl}}", "{{/xl}}"],
];

// Mutex-Gruppen: Wraps innerhalb derselben Gruppe sind semantisch alternativ
// (z.B. Highlight grün ↔ orange, Font-Size lg ↔ xl). Setzt der User
// einen Wrap der Gruppe, werden bestehende Wraps derselben Gruppe vorher
// aus dem Stack geworfen.
const MUTEX_GROUPS: ReadonlyArray<ReadonlyArray<readonly [string, string]>> = [
  [["{{g}}", "{{/g}}"], ["{{o}}", "{{/o}}"]],
  [["{{lg}}", "{{/lg}}"], ["{{xl}}", "{{/xl}}"]],
];

function pairsEqual(a: readonly [string, string], b: readonly [string, string]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

// Peelt ab `start`/`end` alle bekannten Wrap-Paare aus, die die Selektion
// direkt umschliessen. Returnt den Stack (innerster Wrap zuerst, äusserster
// zuletzt) plus die erweiterten Grenzen.
function peelWraps(
  v: string,
  start: number,
  end: number,
): { stack: Array<readonly [string, string]>; outerStart: number; outerEnd: number } {
  const stack: Array<readonly [string, string]> = [];
  let s = start;
  let e = end;
  outer: while (true) {
    for (const pair of WRAP_PAIRS) {
      const [b, a] = pair;
      if (s >= b.length && v.slice(s - b.length, s) === b && v.slice(e, e + a.length) === a) {
        stack.push(pair);
        s -= b.length;
        e += a.length;
        continue outer;
      }
    }
    break;
  }
  return { stack, outerStart: s, outerEnd: e };
}

function rebuildWithStack(
  v: string,
  outerStart: number,
  outerEnd: number,
  innerStart: number,
  innerEnd: number,
  newStack: ReadonlyArray<readonly [string, string]>,
): { next: string; selStart: number; selEnd: number } {
  // Reihenfolge im Stack: index 0 ist der innerste Wrap. Beim Emit kommt
  // der innerste ganz nah am Inhalt, der äusserste ganz aussen.
  const inner = v.slice(innerStart, innerEnd);
  let pre = "";
  let post = "";
  for (const [b, a] of newStack) {
    pre = b + pre;
    post = post + a;
  }
  const next = v.slice(0, outerStart) + pre + inner + post + v.slice(outerEnd);
  const selStart = outerStart + pre.length;
  const selEnd = selStart + inner.length;
  return { next, selStart, selEnd };
}

// Textarea mit FloatingToolbar bei Selektion. Toolbar setzt Marker um die
// aktuelle Selektion herum (Markdown + Custom-Marker für Highlight/Size).
export default function InlineToolbarTextarea({
  value,
  onChange,
  onRequestArticlePick,
  onRequestSourcePick,
  alignment,
  onSetAlignment,
  rows = 3,
  style,
  placeholder,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  // Auto-grow: nach jedem Value-Change die Textarea-Höhe auf scrollHeight
  // setzen. useLayoutEffect feuert vor Paint, damit kein Flackern entsteht.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

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

    // Source-Ref-Insert (`apply("", "[^N]")`) und ähnliche Append-Only-
    // Marker werden nicht durch die Stack-Logik geschickt — einfach hinten
    // anhängen.
    if (before.length === 0) {
      const next = v.slice(0, start) + v.slice(start, end) + after + v.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        const el2 = ref.current;
        if (!el2) return;
        el2.focus();
        el2.setSelectionRange(start, end);
        setHasSelection(true);
      });
      return;
    }

    const targetPair: readonly [string, string] = [before, after];
    const isKnownWrap = WRAP_PAIRS.some((p) => pairsEqual(p, targetPair));

    // Wenn das Toggle-Ziel kein bekannter Wrap ist (z.B. ein Hyperlink-
    // Tupel `[`/`](url)`), fallback: einfach wrappen. Toggle/Combine ist
    // dort nicht gefragt — Links sind nicht idempotent zu togglen.
    if (!isKnownWrap) {
      const next = v.slice(0, start) + before + v.slice(start, end) + after + v.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        const el2 = ref.current;
        if (!el2) return;
        el2.focus();
        el2.setSelectionRange(start + before.length, end + before.length);
        setHasSelection(true);
      });
      return;
    }

    // Stack-Toggle: bestehende Wraps um die Selektion peelen, prüfen ob das
    // Target schon drin ist, dann togglen (entfernen) oder addieren. Bei
    // einem Add werden Mutex-Konkurrenten (z.B. anderes Highlight) vorher
    // aus dem Stack entfernt.
    const { stack, outerStart, outerEnd } = peelWraps(v, start, end);
    const hasTarget = stack.some((p) => pairsEqual(p, targetPair));
    let newStack: Array<readonly [string, string]>;
    if (hasTarget) {
      newStack = stack.filter((p) => !pairsEqual(p, targetPair));
    } else {
      const mutexGroup = MUTEX_GROUPS.find((g) =>
        g.some((p) => pairsEqual(p, targetPair)),
      );
      const filtered = mutexGroup
        ? stack.filter((p) => !mutexGroup.some((m) => pairsEqual(m, p)))
        : [...stack];
      // Neuer Wrap kommt als äusserster auf den Stack (Position am Ende).
      newStack = [...filtered, targetPair];
    }

    const { next, selStart, selEnd } = rebuildWithStack(
      v,
      outerStart,
      outerEnd,
      start,
      end,
      newStack,
    );
    onChange(next);
    requestAnimationFrame(() => {
      const el2 = ref.current;
      if (!el2) return;
      el2.focus();
      el2.setSelectionRange(selStart, selEnd);
      setHasSelection(true);
    });
  }

  // Format-Reset: alle bekannten Inline-Wraps um die Selektion entfernen.
  // Inhalt (Selektion-Text) bleibt unverändert; Block-Alignment ist davon
  // nicht betroffen (lebt im Block-Objekt, nicht im Text).
  function resetFormatting() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const v = el.value;
    const { outerStart, outerEnd } = peelWraps(v, start, end);
    if (outerStart === start && outerEnd === end) return; // nichts zu strippen
    const { next, selStart, selEnd } = rebuildWithStack(
      v,
      outerStart,
      outerEnd,
      start,
      end,
      [],
    );
    onChange(next);
    requestAnimationFrame(() => {
      const el2 = ref.current;
      if (!el2) return;
      el2.focus();
      el2.setSelectionRange(selStart, selEnd);
      setHasSelection(true);
    });
  }

  return (
    <>
      <textarea
        ref={ref}
        rows={rows}
        style={{ overflowY: "hidden", ...style }}
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
          onReset={resetFormatting}
          alignment={alignment}
          onSetAlignment={onSetAlignment}
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
