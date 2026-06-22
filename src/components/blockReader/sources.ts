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
// `index` ist die 0-basierte Array-Position der Quelle in sources[] (=
// Storage-N − 1). Additiv ergaenzt, damit Editor-Konsumenten (Quellen-Tab)
// von der Anzeige-Reihenfolge auf die Mutations-Position zurueckschliessen
// koennen. BlockReader ignoriert das Feld (rendert nur display + source).
export type SourceListItem = { display: number; index: number; source: Source };

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
      items.push({ display: i + 1, index: idx, source: s });
      usedIdx.add(idx);
    }
  });

  // 2) Restliche (nicht inline-referenzierte) Quellen hinten anhaengen.
  let next = items.reduce((max, it) => Math.max(max, it.display), 0) + 1;
  sources.forEach((s, idx) => {
    if (!usedIdx.has(idx)) {
      items.push({ display: next, index: idx, source: s });
      next += 1;
    }
  });

  return items;
}

// ─────────────────────────────────────────────────────────────────────────
// Single Source of Truth fuer die Anzeige-Nummern im Editor.
//
// Beide neuen Funktionen leiten ihre Zahlen AUSSCHLIESSLICH aus den
// bestehenden Renderer-Helpern (buildSourceOrder + computeSourceListItems)
// ab — kein zweiter, paralleler Nummerierungs-Algorithmus. Damit zeigen
// Quellen-Tab, Picker und Editor-Inline-Refs garantiert dieselbe Nummer wie
// die oeffentliche Seite (BlockReader).
// ─────────────────────────────────────────────────────────────────────────

// Liefert die Anzeige-Reihenfolge + -Nummern fuer den Quellen-Tab/Picker:
// referenzierte zuerst (Auftrittsreihenfolge), dann nicht-referenzierte. Jede
// SourceListItem traegt `index` (Array-Position) fuer positionsbasierte
// Mutationen. Identisch zur Liste am Artikel-Ende.
export function computeSourceDisplayItems(
  blocks: Block[],
  sources: Source[],
): SourceListItem[] {
  const { order } = buildSourceOrder(blocks);
  return computeSourceListItems(sources, order);
}

// Editor-Live-Pfad (Tiptap): `orderedNs` sind die Storage-N der `[^N]`-Refs
// in Auftrittsreihenfolge, wie sie aus dem Tiptap-Doc gesammelt werden. Gibt
// `n → Inline-Anzeige-Nummer` zurueck, exakt wie der Renderer fuer die
// Hochzahlen im Fliesstext.
//
// Bewusst ueber buildSourceOrder().mapping — das ist die EXAKTE Quelle der
// Inline-Nummern auf der oeffentlichen Seite (BlockReader.applySourceMapping
// nutzt dieselbe mapping). Damit stimmt der Editor selbst im Dangling-Fall
// mit der Seite ueberein (Dangling-Ref bekommt seinen Auftritts-Rang, auch
// wenn dazu keine Quelle in der Liste existiert). Reiner Reuse via
// synthetischem Block — kein zweiter Rang-Algorithmus. Kein sources-Argument
// noetig: die Inline-Nummer haengt nur an der Auftrittsreihenfolge.
export function displayNumberByRefN(orderedNs: number[]): Map<number, number> {
  const synthetic: Block[] =
    orderedNs.length > 0
      ? [
          {
            id: "__source-ref-scan__",
            type: "paragraph",
            content: orderedNs.map((n) => `[^${n}]`).join(" "),
          },
        ]
      : [];
  return buildSourceOrder(synthetic).mapping;
}
