// Manueller Test-Runner fuer src/lib/ai/modelCheck/report.ts.
//   npx tsx src/lib/ai/modelCheck/__tests__/report.manual.ts

import {
  buildReport,
  classFromModelId,
  costPerCall,
  dedupeFindings,
  formatDelta,
  normalizeModelId,
  recommendForTask,
  recommendationKeys,
  taskStats,
  type CatalogModel,
  type UsageRow,
} from "../report";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }
const near = (a: number | null, b: number, eps = 1e-9) => a !== null && Math.abs(a - b) < eps;

function m(id: string, inP: number | null, outP: number | null, released: string, extra: Partial<CatalogModel> = {}): CatalogModel {
  return {
    modelId: id, label: id, modelClass: classFromModelId(id), inputPerMTok: inP, outputPerMTok: outP,
    longPromptThreshold: null, inputPerMTokLong: null, outputPerMTokLong: null,
    status: "active", retirementDate: null, replacementModelId: null, releasedAt: released, vision: true, ...extra,
  };
}
const CATALOG: CatalogModel[] = [
  m("claude-haiku-5-5", 0.1, 0.5, "2026-10-07", { longPromptThreshold: 100_000, inputPerMTokLong: 0.5, outputPerMTokLong: 2.5 }),
  m("claude-sonnet-5-5", 2, 10, "2026-09-28"),
  m("claude-opus-5-5", 4, 20, "2026-09-22"),
  m("claude-fable-5-1", 10, 50, "2026-09-01"),
  m("claude-haiku-4-5", 1, 5, "2025-10-15"),
  m("claude-opus-4-8", 5, 25, "2026-05-28"),
  m("claude-sonnet-5", 2, 10, "2026-06-30"),
];
const CAT = new Map(CATALOG.map((c) => [c.modelId, c]));
const SELECTABLE = new Set(["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-1"]);
const u = (task: string, model: string, i: number, o: number): UsageRow => ({ task, model, input_tokens: i, output_tokens: o });

section("IDs und Klassen");
{
  ok("Datums-Suffix weg", normalizeModelId("claude-haiku-4-5-20251001") === "claude-haiku-4-5");
  ok("Alias bleibt", normalizeModelId("claude-opus-5-5") === "claude-opus-5-5");
  ok("Klasse aus ID", classFromModelId("claude-fable-5-2") === "fable" && classFromModelId("gpt-x") === "other");
}

section("Kosten pro Aufruf");
{
  ok("Haiku 5.5: 2000 in / 50 out", near(costPerCall(CAT.get("claude-haiku-5-5"), 2000, 50), (2000 * 0.1 + 50 * 0.5) / 1e6));
  ok("Haiku 5.5 ueber 100k: Long-Preis", near(costPerCall(CAT.get("claude-haiku-5-5"), 150_000, 100), (150_000 * 0.5 + 100 * 2.5) / 1e6));
  ok("Preis fehlt → null", costPerCall(m("claude-fable-5-2", null, null, "2026-11-01"), 1000, 100) === null);
  ok("Modell unbekannt → null", costPerCall(undefined, 1000, 100) === null);
}

section("Statistik");
{
  const rows = [u("image_alt", "claude-haiku-4-5", 1600, 45), u("image_alt", "claude-sonnet-5-5", 2000, 48), u("image_alt", "claude-sonnet-5-5", 2100, 50), u("image_alt", "claude-sonnet-5-5", 2067, 46), u("image_alt", "claude-haiku-4-5", 0, 0)];
  const s = taskStats(rows, "image_alt", "claude-sonnet-5-5", 60);
  ok("3 Aufrufe auf aktuellem Modell → gemessen", s?.measured === true && near(s.avgOutput, 48));
  ok("Fehlversuch 0/0 zaehlt nicht", s?.calls === 4);
  ok("Aufrufe pro Monat = 4 * 30/60", near(s?.callsPerMonth ?? null, 2));
  const p = taskStats(rows, "image_alt", "claude-haiku-5-5", 60);
  ok("nach Wechsel ohne Messung → Prognose aus allen", p?.measured === false && p.calls === 4);
  ok("keine Aufrufe → null", taskStats(rows, "seo_review", "claude-opus-5-5") === null);
}

section("Regel Sparen (image_alt auf Sonnet 5.5, kurzer Output)");
{
  const stats = taskStats([u("image_alt", "claude-sonnet-5-5", 2000, 48), u("image_alt", "claude-sonnet-5-5", 2100, 50), u("image_alt", "claude-sonnet-5-5", 2067, 46)], "image_alt", "claude-sonnet-5-5");
  const recs = recommendForTask({ task: "image_alt", currentModel: "claude-sonnet-5-5", stats, catalog: CAT, selectable: SELECTABLE });
  const r = recs.find((x) => x.kind === "sparen");
  ok("schlaegt Haiku 5.5 vor", r?.targetModel === "claude-haiku-5-5", JSON.stringify(recs));
  ok("mit Vergleich", r?.needsComparison === true);
  ok("deutlich billiger (unter −90 %)", (r?.deltaPct ?? 0) < -90, String(r?.deltaPct));
  ok("Delta-Text", (formatDelta(r!) ?? "").startsWith("ca. −95 % = unter 0.01 USD/Monat"), formatDelta(r!) ?? "");
  const noVision = new Map(CAT); noVision.set("claude-haiku-5-5", { ...CAT.get("claude-haiku-5-5")!, vision: false });
  const recs2 = recommendForTask({ task: "image_alt", currentModel: "claude-sonnet-5-5", stats, catalog: noVision, selectable: SELECTABLE });
  ok("ohne Vision kein Haiku-Vorschlag fuer Bilder", !recs2.some((x) => x.kind === "sparen"));
}

section("Kein Sparen bei langem Output");
{
  const stats = taskStats([u("seo_pipeline", "claude-opus-5-5", 3400, 860), u("seo_pipeline", "claude-opus-5-5", 3300, 850), u("seo_pipeline", "claude-opus-5-5", 3350, 870)], "seo_pipeline", "claude-opus-5-5");
  const recs = recommendForTask({ task: "seo_pipeline", currentModel: "claude-opus-5-5", stats, catalog: CAT, selectable: SELECTABLE });
  ok("Opus 5.5 mit 860 Output: keine Empfehlung", recs.length === 0, JSON.stringify(recs));
}

section("Regel Gratis-Upgrade");
{
  const sel = new Set([...SELECTABLE, "claude-opus-4-8"]);
  const stats = taskStats([u("seo_review", "claude-opus-4-8", 4500, 1100), u("seo_review", "claude-opus-4-8", 4500, 1100), u("seo_review", "claude-opus-4-8", 4500, 1100)], "seo_review", "claude-opus-4-8");
  const recs = recommendForTask({ task: "seo_review", currentModel: "claude-opus-4-8", stats, catalog: CAT, selectable: sel });
  const r = recs.find((x) => x.kind === "upgrade");
  ok("Opus 4.8 → Opus 5.5 (neuer, billiger)", r?.targetModel === "claude-opus-5-5", JSON.stringify(recs));
  ok("Delta −20 %", near(r?.deltaPct ?? null, -20, 1e-6));
  const recsNoUsage = recommendForTask({ task: "summary", currentModel: "claude-opus-4-8", stats: null, catalog: CAT, selectable: sel });
  ok("ohne Aufrufe: Upgrade nach Listenpreis", recsNoUsage.some((x) => x.kind === "upgrade" && x.deltaPct === null));
}

section("Regel Qualitaet");
{
  const recs = recommendForTask({ task: "seo_review", currentModel: "claude-haiku-5-5", stats: null, catalog: CAT, selectable: SELECTABLE });
  ok("SEO-Analyse auf Haiku → Sonnet 5.5", recs.some((x) => x.kind === "qualitaet" && x.targetModel === "claude-sonnet-5-5"));
  const ticker = recommendForTask({ task: "news_item_generation", currentModel: "claude-haiku-5-5", stats: null, catalog: CAT, selectable: SELECTABLE });
  ok("News-Ticker auf Haiku → nichts", ticker.length === 0, JSON.stringify(ticker));
}

section("Regel Pflicht");
{
  const cat = new Map(CAT);
  cat.set("claude-sonnet-5-5", { ...CAT.get("claude-sonnet-5-5")!, status: "deprecated", retirementDate: "2027-03-01" });
  const sel = new Set(SELECTABLE);
  const recs = recommendForTask({ task: "abstract_generate", currentModel: "claude-sonnet-5-5", stats: null, catalog: cat, selectable: sel });
  const r = recs.find((x) => x.kind === "pflicht");
  ok("deprecated ohne Nachfolger derselben Klasse → keine Pflicht-Empfehlung ins Leere", r === undefined, JSON.stringify(recs));
  cat.set("claude-sonnet-6", m("claude-sonnet-6", 2, 10, "2027-01-01"));
  sel.add("claude-sonnet-6");
  const recs2 = recommendForTask({ task: "abstract_generate", currentModel: "claude-sonnet-5-5", stats: null, catalog: cat, selectable: sel });
  const r2 = recs2.find((x) => x.kind === "pflicht");
  ok("deprecated → neuestes derselben Klasse", r2?.targetModel === "claude-sonnet-6", JSON.stringify(recs2));
  ok("Grund mit Datum", r2?.reason.includes("01.03.2027") === true, r2?.reason);
}

section("Bericht");
{
  const report = buildReport({
    catalog: CATALOG,
    usage: [u("image_alt", "claude-sonnet-5-5", 2000, 48), u("image_alt", "claude-sonnet-5-5", 2100, 50), u("image_alt", "claude-sonnet-5-5", 2067, 46)],
    defaultModel: "claude-haiku-5-5",
    overrides: { image_alt: "claude-sonnet-5-5", seo_review: "claude-opus-5-5", news_item_generation: "unbekannt-xyz" },
    selectable: new Set([...SELECTABLE, "claude-fable-5-2"]),
  });
  const img = report.tasks.find((t) => t.task === "image_alt");
  ok("image_alt: aktuelles Modell aus Override", img?.currentModel === "claude-sonnet-5-5");
  ok("image_alt: Kosten pro Monat > 0", (img?.costPerMonth ?? 0) > 0);
  const ticker = report.tasks.find((t) => t.task === "news_item_generation");
  ok("unbekanntes Override → Standard-Modell", ticker?.currentModel === "claude-haiku-5-5");
  const pod = report.tasks.find((t) => t.task === "podcast_ingest");
  ok("Task-Default greift (podcast_ingest → Haiku 5.5)", pod?.currentModel === "claude-haiku-5-5");
  ok("Fund: Fable 5.2 fehlt im Katalog", report.findings.some((f) => f.key === "missing:claude-fable-5-2"), JSON.stringify(report.findings));
  ok("Schluessel der Empfehlungen", recommendationKeys(report.tasks).includes("rec:image_alt:sparen:claude-haiku-5-5"));
  const withNew = buildReport({
    catalog: [...CATALOG, m("claude-fable-5-2", null, null, "2026-11-01")],
    usage: [],
    defaultModel: "claude-haiku-5-5",
    overrides: {},
    selectable: SELECTABLE,
  });
  const f = withNew.findings.find((x) => x.key === "newer:claude-fable-5-2");
  ok("Hinweis: neueres Modell nicht waehlbar, Preis fehlt", !!f && f.message.includes("Preis fehlt"), JSON.stringify(withNew.findings));
  ok("aelteres nicht waehlbares Modell (Opus 4.8) ohne Hinweis", !withNew.findings.some((x) => x.key === "newer:claude-opus-4-8"));
}

section("Hinweise entdoppeln");
{
  const d = dedupeFindings([
    { key: "newer:claude-fable-5-2" }, { key: "new:claude-fable-5-2" }, { key: "new:claude-sonnet-6" }, { key: "rec:image_alt:sparen:claude-haiku-5-5" },
  ]);
  ok("new: faellt weg, wenn newer: dasselbe Modell nennt", !d.some((x) => x.key === "new:claude-fable-5-2"));
  ok("anderes neues Modell bleibt", d.some((x) => x.key === "new:claude-sonnet-6"));
  ok("Empfehlungen bleiben", d.some((x) => x.key.startsWith("rec:")));
}

process.stdout.write(`\n${passes} passed, ${fails} failed\n`);
if (fails > 0) process.exit(1);
