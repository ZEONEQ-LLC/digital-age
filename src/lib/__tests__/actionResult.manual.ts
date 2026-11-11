// Manueller Test-Runner: npx tsx src/lib/__tests__/actionResult.manual.ts
import { FormError, GENERIC_ACTION_ERROR, guardMessage, isUniqueViolation, runAction, unwrapAction } from "../actionResult";

let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; return; }
  fail++;
  console.log(`  FAIL  ${name}: ${g} != ${w}`);
}

async function main() {
  const quiet = console.error;
  console.error = () => {};
  try {
    eq("ok", await runAction("t", async () => 42), { ok: true, value: 42 });
    eq("void", await runAction("t", async () => undefined), { ok: true });
    eq("FormError", await runAction("t", async () => { throw new FormError("Titel fehlt."); }), { ok: false, error: "Titel fehlt." });
    eq("Error generisch", await runAction("t", async () => { throw new Error("relation does not exist"); }), { ok: false, error: GENERIC_ACTION_ERROR });
    const pg = { code: "23505", message: 'duplicate key value violates unique constraint "articles_slug_key"' };
    eq("bekannter DB-Fehler", await runAction("t", async () => { throw pg; }, (e) => (isUniqueViolation(e, "articles_slug_key") ? "Slug vergeben." : null)), { ok: false, error: "Slug vergeben." });
    eq("unbekannter DB-Fehler", await runAction("t", async () => { throw pg; }, (e) => (isUniqueViolation(e, "idx_authors_handle") ? "x" : null)), { ok: false, error: GENERIC_ACTION_ERROR });
    eq("guard ok", await guardMessage(async () => {}), null);
    eq("guard FormError", await guardMessage(async () => { throw new FormError("Nicht eingeloggt."); }), "Nicht eingeloggt.");
    eq("guard sonst", await guardMessage(async () => { throw new Error("boom"); }), GENERIC_ACTION_ERROR);
  } finally {
    console.error = quiet;
  }

  eq("unique ja", isUniqueViolation({ code: "23505", message: 'violates unique constraint "idx_authors_handle"' }, "idx_authors_handle"), true);
  eq("unique anderer code", isUniqueViolation({ code: "23503", message: "idx_authors_handle" }, "idx_authors_handle"), false);
  eq("unique null", isUniqueViolation(null, "x"), false);

  eq("unwrap ok", unwrapAction({ ok: true, value: "a" }), "a");
  let msg = "";
  try { unwrapAction({ ok: false, error: "Nicht eingeloggt." }); } catch (e) { msg = e instanceof Error ? e.message : ""; }
  eq("unwrap wirft Meldung", msg, "Nicht eingeloggt.");

  console.log(`${fail === 0 ? "ALL GREEN" : "FAILURES"} — ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}
main();
