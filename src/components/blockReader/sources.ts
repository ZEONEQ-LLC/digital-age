// Reine Logik fuer die Quellen-Liste am Artikel-Ende. Ausserhalb des
// React-Components, damit beide Funktionen ohne JSX-Renderer testbar
// sind (npx tsx → keine react/dom-Dependencies).

import type { Block, Source } from "@/types/blocks";

// Walks blocks to find `[^N]` markers in appearance order. Returns:
//   - mapping: originalN → displayN (1-indexed, in order of first occurrence)
//   - order: sequence of originalN values (display position = index + 1)
//
// Unveraendert gegenueber dem urspruenglich in BlockReader.tsx privaten
// Helper — nur ins Modul gehoben.
export function buildSourceOrder(blocks: Block[]): {
  mapping: Map<number, number>;
  order: number[];
} {
  const mapping = new Map<number, number>();
  const order: number[] = [];
  const re = /\[\^(\d+)\]/g;

  function scan(text: string) {
    for (const m of text.matchAll(re)) {
      const n = parseInt(m[1], 10);
      if (!mapping.has(n)) {
        mapping.set(n, order.length + 1);
        order.push(n);
      }
    }
  }

  for (const b of blocks) {
    if (b.type === "heading" || b.type === "paragraph" || b.type === "quote") {
      scan(b.content);
    } else if (b.type === "list") {
      for (const item of b.items) scan(item);
    }
  }

  return { mapping, order };
}

// Entscheidet, welche Source-Eintraege die Quellen-Liste am Artikel-Ende
// anzeigt. Policy: ALLE Quellen werden gezeigt — eine vollstaendige
// Quellenliste soll nicht teilweise verschwinden, nur weil nicht jede
// Quelle inline mit [^N] zitiert ist. Zwei Gruppen, in dieser Reihenfolge:
//
//   1) Referenzierte Quellen — in Auftrittsreihenfolge der [^N]-Marker,
//      Display-Nummer = Auftritts-Rang (passt zu den Inline-Hochzahlen via
//      buildSourceOrder.mapping). Dangling-Refs (Marker auf nicht-
//      existierende Quelle) werden uebersprungen.
//
//   2) Nicht-referenzierte Quellen ("Pool") — in sources[]-Array-
//      Reihenfolge hinten angehaengt, mit fortlaufenden Display-Nummern.
//
// Frueher (vor diesem Change) wurden bei mind. einem [^N]-Ref NUR die
// referenzierten gezeigt; Pool-Quellen blieben unsichtbar. Das verbarg
// importierte Quellenlisten, von denen nur ein Teil inline zitiert war.
//
// Returns leere Liste nur wenn sources[] leer ist.
export type SourceListItem = { display: number; source: Source };

export function computeSourceListItems(
  sources: Source[],
  order: number[],
): SourceListItem[] {
  const items: SourceListItem[] = [];
  const usedIdx = new Set<number>();

  // 1) Referenzierte zuerst — Display = Auftritts-Rang (i + 1), damit es zu
  //    den Inline-Hochzahlen passt. Reihenfolge/Nummerierung unveraendert.
  order.forEach((originalN, i) => {
    const idx = originalN - 1;
    const s = sources[idx];
    if (s && !usedIdx.has(idx)) {
      items.push({ display: i + 1, source: s });
      usedIdx.add(idx);
    }
  });

  // 2) Restliche (nicht inline-referenzierte) Quellen hinten anhaengen.
  let next = items.reduce((max, it) => Math.max(max, it.display), 0) + 1;
  sources.forEach((s, idx) => {
    if (!usedIdx.has(idx)) {
      items.push({ display: next, source: s });
      next += 1;
    }
  });

  return items;
}
