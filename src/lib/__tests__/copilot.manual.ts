// Manueller Test-Runner fuer src/lib/copilot.ts.
//   npx tsx src/lib/__tests__/copilot.manual.ts

import {
  shouldGenerateAlt,
  shouldApplyCopilotSlug,
  summarizeCopilotReport,
  copilotStepLabel,
  runImageAltBatch,
  summarizeImageAltBatch,
  MAX_IMAGE_ALTS_PER_RUN,
  type CopilotReport,
  type ImageAltTarget,
} from "../copilot";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

const inline = (url: string): ImageAltTarget => ({ kind: "inline", url });

async function main() {
  section("shouldGenerateAlt — Ueberschreib-Schutz");
  ok("leer → generieren", shouldGenerateAlt("") === true);
  ok("whitespace → generieren", shouldGenerateAlt("   ") === true);
  ok("null → generieren", shouldGenerateAlt(null) === true);
  ok("undefined → generieren", shouldGenerateAlt(undefined) === true);
  ok("gefuellt → skip", shouldGenerateAlt("Roboterhand") === false);

  section("shouldApplyCopilotSlug — Slug-Regel");
  ok("nie publiziert (null) → Slug anfassen", shouldApplyCopilotSlug(null) === true);
  ok("publiziert (Timestamp) → Slug NICHT anfassen", shouldApplyCopilotSlug("2026-01-01T00:00:00Z") === false);

  section("summarizeCopilotReport");
  const mk = (statuses: CopilotReport["steps"][number]["status"][]): CopilotReport => ({
    started_at: "2026-07-07T10:00:00Z",
    finished_at: "2026-07-07T10:01:00Z",
    steps: statuses.map((status, i) => ({ step: (["seo", "analyze", "highlights", "image_alt"] as const)[i % 4], status, detail: "" })),
  });
  ok("alle ok", summarizeCopilotReport(mk(["ok", "ok", "ok", "ok"])) === "4 ok");
  ok("gemischt", summarizeCopilotReport(mk(["ok", "ok", "skipped", "failed"])) === "2 ok, 1 übersprungen, 1 fehlgeschlagen");

  section("copilotStepLabel");
  ok("seo", copilotStepLabel("seo") === "SEO generieren");
  ok("image_alt", copilotStepLabel("image_alt") === "Bild-ALT-Texte");

  section("runImageAltBatch");
  ok("Cap-Konstante = 6", MAX_IMAGE_ALTS_PER_RUN === 6);

  const okGen = async (url: string) => ({ ok: true as const, alt: `alt-${url}` });

  const r3 = await runImageAltBatch([inline("a"), inline("b"), inline("c")], okGen);
  ok("3 ok", r3.done === 3 && r3.capped === 0 && Object.keys(r3.inlineAlts).length === 3, JSON.stringify(r3));

  const rEmpty = await runImageAltBatch([], okGen);
  ok("leere Liste → nichts", rEmpty.done === 0 && rEmpty.capped === 0 && rEmpty.rateLimited === false);

  const t8 = Array.from({ length: 8 }, (_, i) => inline(`u${i}`));
  const rCap = await runImageAltBatch(t8, okGen);
  ok("Cap 6 (2 uebersprungen)", rCap.done === 6 && rCap.capped === 2, JSON.stringify(rCap));

  let n = 0;
  const rlGen = async () => {
    n += 1;
    return n >= 2 ? ({ ok: false as const, error: "rate_limit" }) : ({ ok: true as const, alt: "x" });
  };
  const rRL = await runImageAltBatch([inline("a"), inline("b"), inline("c")], rlGen);
  ok("rate_limit bricht Rest ab", rRL.done === 1 && rRL.rateLimited === true, JSON.stringify(rRL));

  const failGen = async (u: string) =>
    u === "b" ? ({ ok: false as const, error: "unknown" }) : ({ ok: true as const, alt: "x" });
  const rFail = await runImageAltBatch([inline("a"), inline("b"), inline("c")], failGen);
  ok("failed zaehlt + laeuft weiter", rFail.done === 2 && rFail.failed === 1 && rFail.rateLimited === false, JSON.stringify(rFail));

  const rHero = await runImageAltBatch([{ kind: "hero", url: "h" }], okGen);
  ok("hero → heroAlt gesetzt", rHero.heroAlt === "alt-h" && Object.keys(rHero.inlineAlts).length === 0);

  section("summarizeImageAltBatch");
  ok("cap-Text",
    summarizeImageAltBatch({ done: 6, failed: 0, rateLimited: false, capped: 2, heroAlt: null, inlineAlts: {} }) ===
      "6 gesetzt, 2 weitere übersprungen (Limit)");
  ok("fehler + rate",
    summarizeImageAltBatch({ done: 1, failed: 1, rateLimited: true, capped: 0, heroAlt: null, inlineAlts: {} }) ===
      "1 gesetzt, 1 fehlgeschlagen, Rest Rate-Limit");

  process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
  if (fails > 0) process.exit(1);
}

void main();
