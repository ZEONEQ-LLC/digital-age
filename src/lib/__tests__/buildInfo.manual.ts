// Manueller Test-Runner: npx tsx src/lib/__tests__/buildInfo.manual.ts
import { buildInfoText } from "../buildInfo";

let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  if (got === want) { pass++; return; }
  fail++;
  console.log(`  FAIL  ${name}: ${JSON.stringify(got)} != ${JSON.stringify(want)}`);
}

eq("voll (Winterzeit)", buildInfoText("0.1.0", "1ae69fe", "2026-11-11T12:45:00.000Z"), "Version 0.1.0 · Build 1ae69fe · Deploy 11.11.2026, 13:45");
eq("Sommerzeit", buildInfoText("0.1.0", "abc1234", "2026-07-01T06:05:00.000Z"), "Version 0.1.0 · Build abc1234 · Deploy 01.07.2026, 08:05");
eq("lokal", buildInfoText("0.1.0", "", "2026-11-11T12:45:00.000Z"), "Version 0.1.0 · Build lokal · Deploy 11.11.2026, 13:45");
eq("ohne Zeit", buildInfoText("0.1.0", "1ae69fe", undefined), "Version 0.1.0 · Build 1ae69fe");
eq("kaputte Zeit", buildInfoText("0.1.0", "1ae69fe", "gestern"), "Version 0.1.0 · Build 1ae69fe");
eq("nichts", buildInfoText(undefined, undefined, undefined), "Build lokal");

console.log(`${fail === 0 ? "ALL GREEN" : "FAILURES"} — ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
