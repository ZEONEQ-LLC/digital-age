// Manueller Test-Runner fuer src/lib/ai/taskModel.ts.
//   npx tsx src/lib/ai/__tests__/taskModel.manual.ts

import { resolveTaskModel, TASK_MODEL_DEFAULTS } from "../taskModel";
import { isKnownModel } from "../models";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

section("image_alt — Vision-Default (Haiku 5.5)");
{
  ok("Task-Default ist Haiku 5.5", TASK_MODEL_DEFAULTS.image_alt === "claude-haiku-5-5");
  ok("Task-Default ist ein bekanntes Modell", isKnownModel(TASK_MODEL_DEFAULTS.image_alt as string));

  // Kein Override → Task-Default schlaegt den generellen Default.
  ok("ohne Override → Haiku (nicht general default)",
    resolveTaskModel("image_alt", undefined, "claude-sonnet-5-5") === "claude-haiku-5-5");

  // DB-Fallback (defaultModel undefined) → trotzdem Haiku.
  ok("DB-Fallback → Haiku",
    resolveTaskModel("image_alt", undefined, undefined) === "claude-haiku-5-5");

  // Gueltiger Admin-Override gewinnt.
  ok("gueltiger Override gewinnt",
    resolveTaskModel("image_alt", "claude-sonnet-5-5", "claude-opus-5-5") === "claude-sonnet-5-5");

  // Ungueltiger Override wird ignoriert → Task-Default.
  ok("ungueltiger Override → Task-Default",
    resolveTaskModel("image_alt", "bogus-model-x", "claude-sonnet-5-5") === "claude-haiku-5-5");

  // Leerer Override → Task-Default.
  ok("leerer Override → Task-Default",
    resolveTaskModel("image_alt", "   ", "claude-sonnet-5-5") === "claude-haiku-5-5");
}

section("Tasks ohne Task-Default → genereller Default / Env-Fallback");
{
  ok("abstract_generate ohne Override → general default",
    resolveTaskModel("abstract_generate", undefined, "claude-sonnet-5-5") === "claude-sonnet-5-5");
  ok("abstract_generate DB-Fallback → undefined (Env-Fallback im Provider)",
    resolveTaskModel("abstract_generate", undefined, undefined) === undefined);
  ok("abstract_generate gueltiger Override gewinnt",
    resolveTaskModel("abstract_generate", "claude-opus-5-5", "claude-sonnet-5-5") === "claude-opus-5-5");
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);
