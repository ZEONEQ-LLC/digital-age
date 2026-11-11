// Manueller Test-Runner: npx tsx src/lib/editor/__tests__/suggestionEdit.manual.ts
import { applySuggestionToDoc, applySuggestionToString, isNoopSuggestion, quotePattern } from "../suggestionEdit";

let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; return; }
  fail++;
  console.log(`  FAIL  ${name}: ${g} != ${w}`);
}

const t = "KI verändert die Bank. Der Rest bleibt.";
eq("replace", applySuggestionToString(t, "KI verändert die Bank.", "KI im Banking spart Stunden.", "replace"), "KI im Banking spart Stunden. Der Rest bleibt.");
eq("insert_before", applySuggestionToString(t, "Der Rest bleibt.", "Neu: 63 %.", "insert_before"), "KI verändert die Bank. Neu: 63 %. Der Rest bleibt.");
eq("insert_after", applySuggestionToString(t, "KI verändert die Bank.", "Neu: 63 %.", "insert_after"), "KI verändert die Bank. Neu: 63 %. Der Rest bleibt.");
eq("whitespace + case", applySuggestionToString("Die  schweizer\nBank", "die Schweizer bank", "X", "replace"), "X");
eq("nicht gefunden", applySuggestionToString(t, "fehlt", "X", "replace"), null);
eq("leeres Zitat", applySuggestionToString(t, "  ", "X", "replace"), null);
eq("leerer Text", applySuggestionToString(t, "KI", "  ", "replace"), null);
eq("Regex-Zeichen", applySuggestionToString("Kosten (in %) sinken?", "(in %) sinken?", "steigen.", "replace"), "Kosten steigen.");
eq("erstes Vorkommen", applySuggestionToString("a b a", "a", "c", "replace"), "c b a");
eq("Pattern null", quotePattern(""), null);

const doc = { type: "doc", content: [{ type: "paragraph", content: [
  { type: "text", text: "Vorne " },
  { type: "text", text: "fett", marks: [{ type: "bold" }] },
  { type: "text", text: " und hinten bleibt." },
] }] };
const replaced = applySuggestionToDoc(doc, "hinten bleibt.", "hinten wird neu.", "replace");
eq("doc replace", replaced?.content[0].content[2], { type: "text", text: " und hinten wird neu." });
eq("doc Marks bleiben", replaced?.content[0].content[1], { type: "text", text: "fett", marks: [{ type: "bold" }] });
eq("Original unveraendert", doc.content[0].content[2].text, " und hinten bleibt.");
eq("doc ueber Knotengrenze", applySuggestionToDoc(doc, "Vorne fett", "X", "replace"), null);
eq("doc nicht gefunden", applySuggestionToDoc(doc, "fehlt", "X", "replace"), null);

eq("noop gleich", isNoopSuggestion("KI im  Banking", "ki im banking"), true);
eq("noop anders", isNoopSuggestion("KI", "KI im Banking"), false);

console.log(`${fail === 0 ? "ALL GREEN" : "FAILURES"} — ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
