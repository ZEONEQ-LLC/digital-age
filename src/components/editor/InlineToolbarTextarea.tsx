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

// Identifiziert alle bekannten Wraps, die die Selektion umgeben, sowohl
// INNERHALB der Selektion (User hat den Wrapper mit-markiert: z.B. nach
// einem vorherigen Bold-Klick) als auch AUSSERHALB (User hat nur den
// inneren Text markiert). Das Decken-beider-Seiten ist nötig, damit das
// Toggle-Verhalten konsistent ist egal wo die Selektion exakt sitzt.
//
// Returnt:
//   stack          — kombiniert, innerster Wrap zuerst, äusserster zuletzt
//   innerStart/End — Bereich des reinen Inhalts (alle Wraps abgezogen)
//   outerStart/End — Bereich, der beim Re-Emit komplett ersetzt wird
//                    (alle erkannten Wraps + Inhalt)
function peelWraps(
  v: string,
  start: number,
  end: number,
): {
  stack: Array<readonly [string, string]>;
  innerStart: number;
  innerEnd: number;
  outerStart: number;
  outerEnd: number;
} {
  // Inside-Peel: Wraps DIREKT innerhalb der Selektion abziehen. Erste
  // Iteration entfernt den selektion-äussersten Wrap (= insgesamt am
  // weitesten aussen unter den inside-Peels).
  let innerStart = start;
  let innerEnd = end;
  const insidePeels: Array<readonly [string, string]> = [];
  let peeling = true;
  while (peeling) {
    peeling = false;
    for (const pair of WRAP_PAIRS) {
      const [b, a] = pair;
      if (
        innerEnd - innerStart >= b.length + a.length &&
        v.slice(innerStart, innerStart + b.length) === b &&
        v.slice(innerEnd - a.length, innerEnd) === a
      ) {
        insidePeels.push(pair);
        innerStart += b.length;
        innerEnd -= a.length;
        peeling = true;
        break;
      }
    }
  }

  // Outside-Peel: Wraps DIREKT ausserhalb der Original-Selektion abziehen.
  // Erste Iteration entfernt den selektion-nächsten Wrap aussen (= am
  // weitesten innen unter den outside-Peels relativ zum Text).
  let outerStart = start;
  let outerEnd = end;
  const outsidePeels: Array<readonly [string, string]> = [];
  peeling = true;
  while (peeling) {
    peeling = false;
    for (const pair of WRAP_PAIRS) {
      const [b, a] = pair;
      if (
        outerStart >= b.length &&
        v.slice(outerStart - b.length, outerStart) === b &&
        v.slice(outerEnd, outerEnd + a.length) === a
      ) {
        outsidePeels.push(pair);
        outerStart -= b.length;
        outerEnd += a.length;
        peeling = true;
        break;
      }
    }
  }

  // Kombinierter Stack innermost-first:
  //   reverse(insidePeels)  — insidePeels[last] war der text-näheste
  //   + outsidePeels        — outsidePeels[0] ist nächst-aussen darüber
  const stack = [...insidePeels].reverse().concat(outsidePeels);
  return { stack, innerStart, innerEnd, outerStart, outerEnd };
}

function rebuildWithStack(
  v: string,
  outerStart: number,
  outerEnd: number,
  innerStart: number,
  innerEnd: number,
  newStack: ReadonlyArray<readonly [string, string]>,
): { next: string; selStart: number; selEnd: number } {
  // Stack-Order: [innermost, ..., outermost]. Beim Iterieren bauen wir
  // pre/post von innen nach aussen auf — innermost-b prepended in pre,
  // innermost-a appended in post.
  const inner = v.slice(innerStart, innerEnd);
  let pre = "";
  let post = "";
  for (const [b, a] of newStack) {
    pre = b + pre;
    post = post + a;
  }
  const next = v.slice(0, outerStart) + pre + inner + post + v.slice(outerEnd);
  // Neue Selektion umfasst den GESAMTEN emittierten Bereich (inkl. Wraps),
  // damit Folge-Klicks die Wraps mit-erkennen und additiv arbeiten können.
  const selStart = outerStart;
  const selEnd = outerStart + pre.length + inner.length + post.length;
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

    // Stack-Toggle: bestehende Wraps um die Selektion peelen (sowohl innen
    // mit-markiert als auch aussen), prüfen ob das Target schon drin ist,
    // dann togglen (entfernen) oder addieren. Bei einem Add werden Mutex-
    // Konkurrenten (z.B. anderes Highlight) vorher aus dem Stack entfernt.
    const { stack, innerStart, innerEnd, outerStart, outerEnd } = peelWraps(
      v,
      start,
      end,
    );
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
      innerStart,
      innerEnd,
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

  // Format-Reset: alle bekannten Inline-Wraps um die Selektion entfernen,
  // egal wie verschachtelt. peelWraps deckt sowohl innen mit-markierte
  // Wraps als auch aussen-stehende ab — Reset baut anschliessend mit
  // leerem Stack neu auf, sodass der reine Inhalt übrig bleibt. Block-
  // Alignment ist davon nicht betroffen (lebt im Block-Objekt).
  function resetFormatting() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const v = el.value;
    const { stack, innerStart, innerEnd, outerStart, outerEnd } = peelWraps(
      v,
      start,
      end,
    );
    if (stack.length === 0) return; // nichts zu strippen
    const { next, selStart, selEnd } = rebuildWithStack(
      v,
      outerStart,
      outerEnd,
      innerStart,
      innerEnd,
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
