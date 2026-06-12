// Manueller Test-Runner fuer src/lib/editor/urlStatus.ts.
//   npx tsx src/lib/editor/__tests__/urlStatus.manual.ts

import { categorizeStatus } from "../urlStatus";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}\n`); }
}

ok("200 → ok", categorizeStatus(200) === "ok");
ok("204 → ok", categorizeStatus(204) === "ok");
ok("301 → redirect", categorizeStatus(301) === "redirect");
ok("404 → dead", categorizeStatus(404) === "dead");
ok("410 → dead", categorizeStatus(410) === "dead");
ok("401 → blocked", categorizeStatus(401) === "blocked");
ok("403 → blocked", categorizeStatus(403) === "blocked");
ok("429 → blocked", categorizeStatus(429) === "blocked");
ok("400 → error", categorizeStatus(400) === "error");
ok("500 → error", categorizeStatus(500) === "error");
ok("503 → error", categorizeStatus(503) === "error");

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);
