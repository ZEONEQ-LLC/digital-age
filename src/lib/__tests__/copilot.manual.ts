// Manueller Test-Runner fuer src/lib/copilot.ts.
//   npx tsx src/lib/__tests__/copilot.manual.ts

import {
  shouldGenerateAlt,
  shouldApplyCopilotSlug,
  summarizeCopilotReport,
  copilotStepLabel,
  type CopilotReport,
} from "../copilot";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

section("shouldGenerateAlt — Ueberschreib-Schutz");
{
  ok("leer → generieren", shouldGenerateAlt("") === true);
  ok("whitespace → generieren", shouldGenerateAlt("   ") === true);
  ok("null → generieren", shouldGenerateAlt(null) === true);
  ok("undefined → generieren", shouldGenerateAlt(undefined) === true);
  ok("gefuellt → skip", shouldGenerateAlt("Roboterhand") === false);
}

section("shouldApplyCopilotSlug — Slug-Regel");
{
  ok("nie publiziert (null) → Slug anfassen", shouldApplyCopilotSlug(null) === true);
  ok("publiziert (Timestamp) → Slug NICHT anfassen", shouldApplyCopilotSlug("2026-01-01T00:00:00Z") === false);
}

section("summarizeCopilotReport");
{
  const mk = (statuses: CopilotReport["steps"][number]["status"][]): CopilotReport => ({
    started_at: "2026-07-07T10:00:00Z",
    finished_at: "2026-07-07T10:01:00Z",
    steps: statuses.map((status, i) => ({ step: (["seo", "analyze", "highlights", "image_alt"] as const)[i % 4], status, detail: "" })),
  });
  ok("alle ok", summarizeCopilotReport(mk(["ok", "ok", "ok", "ok"])) === "4 ok");
  ok("gemischt", summarizeCopilotReport(mk(["ok", "ok", "skipped", "failed"])) === "2 ok, 1 übersprungen, 1 fehlgeschlagen");
  ok("nur skip zusatz", summarizeCopilotReport(mk(["ok", "skipped"])) === "1 ok, 1 übersprungen");
}

section("copilotStepLabel");
{
  ok("seo", copilotStepLabel("seo") === "SEO generieren");
  ok("analyze", copilotStepLabel("analyze") === "SEO-Analyse");
  ok("highlights", copilotStepLabel("highlights") === "Highlights");
  ok("image_alt", copilotStepLabel("image_alt") === "Bild-ALT-Texte");
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);
