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
// anzeigt. Drei Faelle, klar getrennt:
//
//   (A) Body hat MINDESTENS einen [^N]-Inline-Ref (order.length > 0).
//       Heutiges Verhalten unveraendert: nur die referenzierten Quellen
//       in Auftrittsreihenfolge, Display-Nummer = Auftritts-Rang.
//       Dangling-Refs (Marker auf nicht-existierende Quelle) werden
//       uebersprungen.
//
//   (B) Body hat 0 [^N]-Refs UND sources[] ist nicht leer (Andreas-Fall).
//       NEU: alle sources werden in Array-Reihenfolge nummeriert
//       angezeigt. Damit verschwinden importierte Quellen-Listen nicht
//       mehr unsichtbar im sources-Pool.
//
//   (C) Mischfall — manche Quellen referenziert, andere nicht. Da
//       (A) bereits greift, sobald MINDESTENS ein Ref vorhanden ist,
//       behandeln wir (C) wie (A): nur die referenzierten zeigen.
//       Bewusste konservative Entscheidung — vermeidet Regression
//       fuer bestehende Artikel und respektiert "Pool-Quellen, die
//       der Author bewusst nicht referenziert hat" (sie waren auch
//       vorher unsichtbar). Wenn ein Mix-Mode-Verhalten spaeter
//       explizit gewuenscht ist, kann das separat addressiert werden.
//
// Returns leere Liste wenn sources leer ist und keine Refs existieren.
export type SourceListItem = { display: number; source: Source };

export function computeSourceListItems(
  sources: Source[],
  order: number[],
): SourceListItem[] {
  // Fall (A) + (C) — bestehendes Verhalten.
  if (order.length > 0) {
    const items: SourceListItem[] = [];
    order.forEach((originalN, i) => {
      const s = sources[originalN - 1];
      if (s) items.push({ display: i + 1, source: s });
    });
    return items;
  }
  // Fall (B) — neu: alle Quellen in Array-Reihenfolge.
  if (sources.length > 0) {
    return sources.map((s, i) => ({ display: i + 1, source: s }));
  }
  return [];
}
