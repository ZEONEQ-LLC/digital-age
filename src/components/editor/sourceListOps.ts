// Reine Logik fuer die Quellen-Verwaltung (Quellen-Tab + SourcePicker).
// Ausserhalb der React-Komponenten, damit ohne JSX-Renderer testbar
// (npx tsx). Inline-Marker `[^N]` sind 1-indexed und referenzieren
// sources[N-1] POSITIONSBASIERT — deshalb ist Reihenfolge heilig.

import type { Block, Source } from "@/types/blocks";
import { buildSourceOrder } from "@/components/blockReader/sources";

// 0-basierte Indizes der Quellen, die im Body via [^N] referenziert sind.
export function referencedSourceIndices(blocks: Block[]): Set<number> {
  const { order } = buildSourceOrder(blocks);
  const set = new Set<number>();
  for (const n of order) set.add(n - 1); // [^N] → sources[N-1]
  return set;
}

// Sicher loeschbare Indizes: eine Quelle darf NUR entfernt werden, wenn sie
// (a) selbst nicht referenziert ist UND (b) keine referenzierte Quelle hinter
// ihr steht. Sonst wuerden sich die Positionen aller nachfolgenden Quellen
// verschieben und bestehende [^N]-Marker im Body auf die falsche Quelle (oder
// ins Leere) zeigen. Praktisch: nur das unreferenzierte "Schwanz-Ende" der
// Liste ist loeschbar. Ohne jeden Ref ist alles loeschbar.
export function deletableSourceIndices(
  sourcesLength: number,
  referenced: Set<number>,
): Set<number> {
  let maxRef = -1;
  for (const idx of referenced) if (idx > maxRef) maxRef = idx;
  const set = new Set<number>();
  for (let k = 0; k < sourcesLength; k++) {
    if (!referenced.has(k) && k > maxRef) set.add(k);
  }
  return set;
}

// Text/URL einer Quelle ersetzen — Position (= N) bleibt unveraendert.
export function updateSourceAt(
  sources: Source[],
  index: number,
  patch: { text: string; url?: string },
): Source[] {
  return sources.map((s, i) =>
    i === index
      ? { id: s.id, text: patch.text, ...(patch.url ? { url: patch.url } : {}) }
      : s,
  );
}

// Neue Quelle ans Ende — bekommt damit die naechste freie Nummer.
export function appendSource(
  sources: Source[],
  src: { text: string; url?: string },
  id: string,
): Source[] {
  return [
    ...sources,
    { id, text: src.text, ...(src.url ? { url: src.url } : {}) },
  ];
}

// Quelle entfernen — NUR wenn der Index sicher loeschbar ist (siehe
// deletableSourceIndices). Andernfalls werden die Quellen unveraendert
// zurueckgegeben (Defense-in-depth, falls die UI das Gate umgeht).
export function removeSourceAt(
  sources: Source[],
  index: number,
  referenced: Set<number>,
): Source[] {
  const deletable = deletableSourceIndices(sources.length, referenced);
  if (!deletable.has(index)) return sources;
  return sources.filter((_, i) => i !== index);
}
