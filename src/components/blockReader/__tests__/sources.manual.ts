// Manueller Test-Runner fuer src/components/blockReader/sources.ts.
//   npx tsx src/components/blockReader/__tests__/sources.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.
//
// Fokus: die Single-Source-of-Truth-Funktionen fuer die Anzeige-Nummern
// (computeSourceListItems mit index, computeSourceDisplayItems,
// displayNumberByRefN). Sie muessen mit der Renderer-Reihenfolge der
// oeffentlichen Seite uebereinstimmen (referenzierte zuerst nach Auftritt,
// dann nicht-referenzierte).

import {
  buildSourceOrder,
  computeSourceListItems,
  computeSourceDisplayItems,
  displayNumberByRefN,
  sourceDisplayItemsForRefNs,
} from "../sources";
import type { Block, Source } from "../../../types/blocks";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

const S = (n: number): Source[] =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, text: `Q${i + 1}`, url: `https://x/${i + 1}` }));

const para = (content: string): Block => ({ id: "b", type: "paragraph", content });

// Kompakte Repraesentation: display:index:id pro Item, in Anzeige-Reihenfolge.
const fmt = (items: { display: number; index: number; source: Source }[]) =>
  items.map((it) => `${it.display}:${it.index}:${it.source.id}`).join(" ");

section("computeSourceListItems — index-Feld + Reihenfolge");
{
  // 5 Quellen, nur die 5. zitiert (Reproduktionsfall aus der Diagnose).
  const { order } = buildSourceOrder([para("Nur ein Ref [^5] hier.")]);
  const items = computeSourceListItems(S(5), order);
  // Erwartung: referenziert zuerst (s5 → display 1, index 4), dann Pool
  // s1..s4 → display 2..5, index 0..3.
  ok("Repro: s5 zuerst als display 1", items[0].display === 1 && items[0].index === 4 && items[0].source.id === "s5", fmt(items));
  ok("Pool s1..s4 als 2..5 in Array-Reihenfolge",
    fmt(items.slice(1)) === "2:0:s1 3:1:s2 4:2:s3 5:3:s4", fmt(items));
}
{
  // Auftrittsreihenfolge != Array-Reihenfolge: [^3] vor [^1].
  const { order } = buildSourceOrder([para("Erst [^3], dann [^1].")]);
  const items = computeSourceListItems(S(3), order);
  ok("[^3] vor [^1]: s3 display 1, s1 display 2",
    items[0].source.id === "s3" && items[0].display === 1 &&
    items[1].source.id === "s1" && items[1].display === 2, fmt(items));
  ok("Pool s2 als display 3 hinten", items[2].source.id === "s2" && items[2].display === 3, fmt(items));
}

section("computeSourceDisplayItems — Blocks → geordnete Items");
{
  const blocks = [para("Intro [^2]."), para("Mehr [^4] und [^2] nochmal.")];
  const items = computeSourceDisplayItems(blocks, S(4));
  // Auftritt: [^2] (rank1), [^4] (rank2). Pool: s1, s3.
  ok("referenziert zuerst: s2=1, s4=2",
    items[0].source.id === "s2" && items[0].display === 1 &&
    items[1].source.id === "s4" && items[1].display === 2, fmt(items));
  ok("Pool s1,s3 als 3,4 (Array-Reihenfolge)",
    items[2].source.id === "s1" && items[2].display === 3 &&
    items[3].source.id === "s3" && items[3].display === 4, fmt(items));
  ok("Mehrfach-Ref derselben Quelle ([^2] 2x) → nur 1 Item", items.filter((it) => it.source.id === "s2").length === 1);
}
{
  ok("leere sources → leere Items", computeSourceDisplayItems([para("[^1]")], []).length === 0);
  ok("keine Refs → alle als Pool in Array-Reihenfolge",
    fmt(computeSourceDisplayItems([para("kein ref")], S(3))) === "1:0:s1 2:1:s2 3:2:s3");
  // alle referenziert in Auftrittsreihenfolge
  const allRef = computeSourceDisplayItems([para("[^2] [^1] [^3]")], S(3));
  ok("alle referenziert: 2,1,3 → display 1,2,3",
    fmt(allRef) === "1:1:s2 2:0:s1 3:2:s3", fmt(allRef));
}

section("displayNumberByRefN — Editor-Live-Pfad (n → Inline-Nummer)");
{
  // orderedNs simuliert das Sammeln der [^N] aus dem Tiptap-Doc.
  const m = displayNumberByRefN([5]);
  ok("Repro: n=5 → display 1", m.get(5) === 1, JSON.stringify([...m]));
  ok("nur zitierte n in Map (Repro: nur n=5)", m.size === 1 && m.has(5), JSON.stringify([...m]));
}
{
  // Auftritt 3,1 → ranks 1,2.
  const m = displayNumberByRefN([3, 1]);
  ok("n=3 → 1, n=1 → 2", m.get(3) === 1 && m.get(1) === 2, JSON.stringify([...m]));
}
{
  // Mehrfach-Ref: [^2] zweimal → beide gleicher Rang.
  const m = displayNumberByRefN([2, 4, 2]);
  ok("Mehrfach [^2] → konsistent display 1", m.get(2) === 1, JSON.stringify([...m]));
  ok("[^4] → display 2", m.get(4) === 2, JSON.stringify([...m]));
  ok("nur distinkte n als Keys (2,4)", m.size === 2, JSON.stringify([...m]));
}
{
  // Dangling: [^9] vor [^1]. buildSourceOrder.mapping kennt KEINE Quellen —
  // der Rang folgt rein dem Auftritt, exakt wie BlockReader.applySourceMapping.
  // Renderer zeigt fuer [^9] eine "1" (mit ins Leere zeigendem Anker) und fuer
  // [^1] eine "2". Der Editor spiegelt das 1:1.
  const m = displayNumberByRefN([9, 1]);
  ok("Dangling n=9 → display 1 (Auftritts-Rang, wie Renderer)", m.get(9) === 1, JSON.stringify([...m]));
  ok("n=1 nach Dangling → display 2 (wie Renderer)", m.get(1) === 2, JSON.stringify([...m]));
}
{
  ok("leere orderedNs → leere Map", displayNumberByRefN([]).size === 0);
}

section("Konsistenz: Inline-Nummer == Quellen-Tab-Nummer (valide Refs)");
{
  // Fuer existierende, referenzierte Quellen muessen Inline (mapping) und
  // Quellen-Tab (computeSourceListItems) DIESELBE Nummer liefern.
  const blocks = [para("[^4] dann [^2] dann [^4].")];
  const items = computeSourceDisplayItems(blocks, S(4));
  const byN = displayNumberByRefN([4, 2, 4]);
  const consistent = items
    .filter((it) => byN.has(it.index + 1))
    .every((it) => byN.get(it.index + 1) === it.display);
  ok("referenzierte Quellen: gleiche Nummer in beiden Pfaden", consistent,
    `items=${fmt(items)} byN=${JSON.stringify([...byN])}`);
  // Konkret: s4 zuerst (Inline 1, Tab 1), s2 (Inline 2, Tab 2).
  ok("s4 → 1 in beiden", byN.get(4) === 1 && items.find((it) => it.source.id === "s4")!.display === 1);
  ok("s2 → 2 in beiden", byN.get(2) === 2 && items.find((it) => it.source.id === "s2")!.display === 2);
}

section("sourceDisplayItemsForRefNs — Picker-Pfad (Live-Ns → geordnete Items)");
{
  // Muss identisch zu computeSourceDisplayItems mit aequivalenten Blocks sein.
  const fromNs = sourceDisplayItemsForRefNs([5], S(5));
  const fromBlocks = computeSourceDisplayItems([para("[^5]")], S(5));
  ok("Live-Ns == Blocks-Pfad (Repro 5/1)", fmt(fromNs) === fmt(fromBlocks), `${fmt(fromNs)} | ${fmt(fromBlocks)}`);
  ok("Picker zeigt alle 5 Quellen", fromNs.length === 5);
  ok("s5 zuerst (display 1, index 4)", fromNs[0].source.id === "s5" && fromNs[0].display === 1 && fromNs[0].index === 4);
}
{
  ok("leere Ns → Pool in Array-Reihenfolge",
    fmt(sourceDisplayItemsForRefNs([], S(3))) === "1:0:s1 2:1:s2 3:2:s3");
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);
