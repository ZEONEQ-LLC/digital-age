// Manueller Test-Runner fuer die Prompts der KI-Redaktion (PR 197):
// src/lib/promptGen/generate.ts.
//
//   npx tsx src/lib/promptGen/__tests__/generate.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import {
  MAX_EXAMPLE_OUTPUT,
  PROMPTS_PER_RUN,
  PROMPT_GENERATION_STRATEGY,
  buildExamplePrompt,
  buildGenerationPrompt,
  fillPlaceholders,
  formatExampleOutput,
  isoWeek,
  normalizeTitle,
  parseGenerated,
  pickCategories,
} from "../generate";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}

const item = (o: Record<string, unknown> = {}) => ({
  title: "Offerte in zehn Minuten gegenprüfen",
  category: "business",
  difficulty: "intermediate",
  context: "Für KMU, die Offerten von Lieferanten schnell auf Lücken, Risiken und Verhandlungsspielraum prüfen wollen.",
  prompt_text: "Du prüfst eine Offerte aus Sicht der Einkäuferin. ".repeat(6) + "Offerte: [OFFERTE]",
  beispielwerte: { OFFERTE: "Website-Relaunch für 18'000 CHF" },
  ...o,
});

console.log("=== pickCategories ===");
{
  const r = pickCategories({ business: 1, kreativ: 1, marketing: 1 }, 3, 0);
  ok("leere Kategorien zuerst", JSON.stringify(r) === '["code","strategie","lernen"]', JSON.stringify(r));
  ok("nie «andere»", !pickCategories({}, 6, 3).includes("andere" as never));
  const w1 = pickCategories({}, 3, 1);
  const w2 = pickCategories({}, 3, 2);
  ok("Gleichstand rotiert mit der Woche", JSON.stringify(w1) !== JSON.stringify(w2), `${w1} / ${w2}`);
  ok("negative Woche ok", pickCategories({}, 3, -1).length === 3);
}

console.log("=== isoWeek ===");
ok("01.01.2026 = KW 1", isoWeek(new Date("2026-01-01T12:00:00Z")) === 1);
ok("12.11.2026 = KW 46", isoWeek(new Date("2026-11-12T12:00:00Z")) === 46);
ok("28.12.2026 = KW 53", isoWeek(new Date("2026-12-28T12:00:00Z")) === 53);

console.log("=== Prompt ===");
{
  const { system, prompt } = buildGenerationPrompt("lernen", ["Alter Titel"], undefined, "expert");
  ok("Strategie im System", system.includes(PROMPT_GENERATION_STRATEGY.split("\n")[0]));
  ok("eine Kategorie im Prompt", prompt.includes("lernen (Lernen)") && !prompt.includes("code (Code)"));
  ok("Schwierigkeit vorgegeben", prompt.includes("Schwierigkeit: expert"));
  ok("bestehende Titel im Prompt", prompt.includes("- Alter Titel"));
  ok("Ausgabe ein Objekt mit beispielwerte", system.includes('"beispielwerte"') && !system.includes('"prompts"'));
  ok("Override ersetzt Strategie", !buildGenerationPrompt("code", [], "X").system.includes("AUFTRAG:"));
  const g = parseGenerated(JSON.stringify(item()), [])![0];
  const ex = buildExamplePrompt(g);
  ok("Beispiel im Code eingesetzt", ex.prompt.includes("18'000 CHF") && !ex.prompt.includes("[OFFERTE]"), ex.prompt.slice(-80));
  ok("Kopfzeile der Beispielwerte", g.example_values === "Offerte: Website-Relaunch für 18'000 CHF", g.example_values);
}

console.log("=== parseGenerated ===");
{
  ok("gueltiger Prompt (Liste)", parseGenerated(JSON.stringify({ prompts: [item()] }), [])?.length === 1);
  ok("gueltiger Prompt (einzelnes Objekt)", parseGenerated(JSON.stringify(item()), [])?.length === 1);
  ok("gueltiger Prompt ({prompt: …})", parseGenerated(JSON.stringify({ prompt: item() }), [])?.length === 1);
  ok("ohne Beispielwerte trotzdem gueltig", parseGenerated(JSON.stringify(item({ beispielwerte: undefined })), [])?.[0].example_fill.includes("[OFFERTE]") === true);
  ok("kein JSON → null", parseGenerated("Hier sind drei Prompts:", []) === null);
  ok("ohne prompts-Liste → null", parseGenerated(JSON.stringify({ items: [] }), []) === null);
  ok("Kategorie gross geschrieben akzeptiert", parseGenerated(JSON.stringify(item({ category: "Lernen" })), [])?.[0].category === "lernen");
  ok("vorgegebene Kategorie gewinnt", parseGenerated(JSON.stringify(item({ category: "lernen (Lernen)" })), [], "kreativ")?.[0].category === "kreativ");
  ok("unbekannte Kategorie verworfen", parseGenerated(JSON.stringify({ prompts: [item({ category: "andere" })] }), [])?.length === 0);
  ok("zu kurzer Prompt verworfen", parseGenerated(JSON.stringify({ prompts: [item({ prompt_text: "Schreib was." })] }), [])?.length === 0);
  ok("unbekannte Schwierigkeit → intermediate", parseGenerated(JSON.stringify({ prompts: [item({ difficulty: "mittel" })] }), [])?.[0].difficulty === "intermediate");
  ok("Titel auf 80 Zeichen", (parseGenerated(JSON.stringify({ prompts: [item({ title: "T".repeat(120) })] }), [])?.[0].title.length ?? 0) === 80);
  ok("bestehender Titel (Gross/Klein, Satzzeichen) verworfen",
    parseGenerated(JSON.stringify({ prompts: [item()] }), ["offerte in zehn minuten gegenpruefen"])?.length === 1 &&
    parseGenerated(JSON.stringify({ prompts: [item()] }), ["Offerte in zehn Minuten gegenprüfen!"])?.length === 0);
  ok("Dublette im selben Lauf", parseGenerated(JSON.stringify({ prompts: [item(), item()] }), [])?.length === 1);
  const many = Array.from({ length: 5 }, (_, i) => item({ title: `Prompt ${i}` }));
  ok(`hoechstens ${PROMPTS_PER_RUN}`, parseGenerated(JSON.stringify({ prompts: many }), [])?.length === PROMPTS_PER_RUN);
  ok("Eszett wird ss", parseGenerated(JSON.stringify({ prompts: [item({ context: "Für Grossbetriebe und alle, die gross denken, ß. ".repeat(2) })] }), [])?.[0].context.includes("ß") === false);
  ok("Zeilenumbrueche im Prompt bleiben", parseGenerated(JSON.stringify({ prompts: [item({ prompt_text: "Zeile 1\n\n".repeat(40) })] }), [])?.[0].prompt_text.includes("\n\n") === true);
  ok("normalizeTitle", normalizeTitle("Ärger — vermeiden!") === "arger vermeiden");
}

console.log("=== fillPlaceholders ===");
ok("Gross/Klein und Leerzeichen egal", fillPlaceholders("A [Branche] B [ZIEL KUNDE].", { BRANCHE: "Treuhand", ziel_kunde: "KMU" }) === "A Treuhand B KMU.");
ok("unbekannte bleiben", fillPlaceholders("X [UNBEKANNT]", { A: "b" }) === "X [UNBEKANNT]");
ok("Schluessel mit Klammern", fillPlaceholders("[ORT]", { "[ORT]": "Luzern" }) === "Luzern");
ok("Markdown-Link bleibt", fillPlaceholders("[Text](https://x.ch)", {}) === "[Text](https://x.ch)");

console.log("=== formatExampleOutput ===");
{
  const out = formatExampleOutput("Branche: Treuhand", "## Ergebnis\n**Wichtig:** Das ist der Text, lang genug für einen Test.");
  ok("Kopfzeile mit Beispielwerten", out?.startsWith("Beispiel mit Branche: Treuhand\n\n") === true, out ?? "null");
  ok("Markdown-Ueberschrift und Fett entfernt", !!out && !out.includes("##") && !out.includes("**"));
  ok("zu kurz → null", formatExampleOutput("x", "ok") === null);
  const long = formatExampleOutput("x", "Wort ".repeat(1000));
  ok(`gekuerzt auf ${MAX_EXAMPLE_OUTPUT}`, !!long && long.length <= MAX_EXAMPLE_OUTPUT && long.endsWith("…"), String(long?.length));
}

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);
