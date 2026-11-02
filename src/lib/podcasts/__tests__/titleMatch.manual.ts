// Manueller Test-Runner fuer src/lib/podcasts/titleMatch.ts.
//   npx tsx src/lib/podcasts/__tests__/titleMatch.manual.ts
import { bestSimilarity, normalizeTitle, pickBest } from "../titleMatch";

let passes = 0, fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}

ok("Praefix #541 - entfernt", normalizeTitle("#541 - Mark Cuban: AI Could Bankrupt Us") === "mark cuban ai could bankrupt us");
ok("Praefix Ep. 12: entfernt", normalizeTitle("Ep. 12: Die Zukunft der Arbeit") === "die zukunft der arbeit");
ok("Praefix Folge 7 | entfernt", normalizeTitle("Folge 7 | KI im Alltag") === "ki im alltag");
ok("Umlaute bleiben", normalizeTitle("Wenn Agenten unlösbare Mathematik meistern") === "wenn agenten unlösbare mathematik meistern");

const apple = "KI knackt Millennium-Problem: Wenn Agenten unlösbare Mathematik meistern";
ok("identisch = 1", bestSimilarity(apple, apple) === 1);
ok("mit Anhang | NZZ >= 0.6", bestSimilarity(apple, "KI knackt Millennium-Problem: Wenn Agenten unlösbare Mathematik meistern | NZZ Quantensprung") >= 0.6);
ok("Clip-Titel < 0.6", bestSimilarity(apple, "Die besten Momente der Woche: Mathematik") < 0.6, String(bestSimilarity(apple, "Die besten Momente der Woche: Mathematik")));
ok("anderes Thema < 0.6", bestSimilarity(apple, "Warum Startups scheitern") < 0.6);
ok("gekuerzter Plattformtitel (Containment) >= 0.6", bestSimilarity("The Great AI Debate: Is Artificial Intelligence an Extinction Threat?", "The Great AI Debate") >= 0.6);

const picked = pickBest("Mark Cuban: AI Could Bankrupt Us Into A Deep Debt Bubble!", [
  { item: "a", title: "Mark Cuban on AI (Clip)" },
  { item: "b", title: "#541 - Mark Cuban: AI Could Bankrupt Us Into A Deep Debt Bubble! | DOAC" },
  { item: "c", title: "Trump vs. Musk: A Deep Debt Bubble?" },
], 0.6);
ok("pickBest waehlt den vollen Titel", picked?.item === "b", JSON.stringify(picked));
ok("pickBest null unter Schwelle", pickBest("Völlig anderer Titel über Quantencomputer", [{ item: "x", title: "Mark Cuban on AI" }], 0.6) === null);
ok("Show-Namen: NZZ Quantensprung vs NZZ Quantensprung Podcast >= 0.7", bestSimilarity("NZZ Quantensprung", "NZZ Quantensprung Podcast") >= 0.7, String(bestSimilarity("NZZ Quantensprung", "NZZ Quantensprung Podcast")));
ok("Show-Namen: The Diary Of A CEO vs Diary of a CEO Clips < 0.7 oder >= 0.5", bestSimilarity("The Diary Of A CEO", "The Diary Of A CEO Clips") >= 0.5);

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);
