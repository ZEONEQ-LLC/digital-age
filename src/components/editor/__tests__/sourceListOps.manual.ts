// Manueller Test-Runner fuer src/components/editor/sourceListOps.ts.
//   npx tsx src/components/editor/__tests__/sourceListOps.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.

import {
  referencedSourceIndices,
  deletableSourceIndices,
  updateSourceAt,
  appendSource,
  removeSourceAt,
} from "../sourceListOps";
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

section("referencedSourceIndices");
{
  const blocks = [para("Refs [^2] und [^5] und nochmal [^2].")];
  const ref = referencedSourceIndices(blocks);
  ok("[^2],[^5] → Indizes {1,4}", ref.has(1) && ref.has(4) && ref.size === 2,
    JSON.stringify([...ref]));
  ok("keine Refs → leeres Set", referencedSourceIndices([para("kein ref")]).size === 0);
}

section("deletableSourceIndices — nur unreferenziertes Schwanz-Ende");
{
  // 5 Quellen, referenziert: 0 und 2 (N1, N3). maxRef=2.
  const ref = new Set([0, 2]);
  const del = deletableSourceIndices(5, ref);
  ok("nur Indizes > maxRef(2) und unreferenziert → {3,4}",
    del.has(3) && del.has(4) && del.size === 2, JSON.stringify([...del]));
  ok("referenzierte (0,2) nicht loeschbar", !del.has(0) && !del.has(2));
  ok("unreferenzierte VOR letztem Ref (1) nicht loeschbar", !del.has(1));
}
{
  // Kein Ref → alles loeschbar.
  const del = deletableSourceIndices(3, new Set());
  ok("kein Ref → alle 3 loeschbar", del.size === 3);
}
{
  // ai-agents-Muster: 1..28 referenziert (Idx 0..27), 29..38 Muell (Idx 28..37).
  const ref = new Set(Array.from({ length: 28 }, (_, i) => i));
  const del = deletableSourceIndices(38, ref);
  ok("Muell-Schwanz (Idx 28..37) komplett loeschbar", del.size === 10 && del.has(28) && del.has(37));
  ok("referenzierter Bereich nicht loeschbar", !del.has(0) && !del.has(27));
}

section("updateSourceAt — positionsstabil");
{
  const out = updateSourceAt(S(3), 1, { text: "neu", url: "https://neu" });
  ok("Index 1 ersetzt", out[1].text === "neu" && out[1].url === "https://neu");
  ok("id bleibt erhalten", out[1].id === "s2");
  ok("Nachbarn unveraendert", out[0].text === "Q1" && out[2].text === "Q3");
  ok("Laenge unveraendert (N's stabil)", out.length === 3);
  const noUrl = updateSourceAt(S(2), 0, { text: "x" });
  ok("ohne URL → kein url-Feld", noUrl[0].url === undefined);
}

section("appendSource — ans Ende");
{
  const out = appendSource(S(2), { text: "neu", url: "https://n" }, "newid");
  ok("Laenge +1", out.length === 3);
  ok("neue Quelle am Ende (= N3)", out[2].text === "neu" && out[2].id === "newid");
  ok("bestehende unveraendert", out[0].text === "Q1" && out[1].text === "Q2");
}

section("removeSourceAt — nur sicher loeschbar");
{
  const ref = new Set([0, 2]); // maxRef=2
  const sources = S(5);
  ok("loeschbarer Index 4 → entfernt (Laenge 4)",
    removeSourceAt(sources, 4, ref).length === 4);
  ok("loeschbarer Index 3 → Q4 weg",
    !removeSourceAt(sources, 3, ref).some((s) => s.text === "Q4"));
  ok("UNsicherer Index 2 (referenziert) → unveraendert",
    removeSourceAt(sources, 2, ref).length === 5);
  ok("UNsicherer Index 1 (vor letztem Ref) → unveraendert",
    removeSourceAt(sources, 1, ref).length === 5);
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);
