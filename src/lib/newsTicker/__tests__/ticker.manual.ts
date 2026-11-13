// Manueller Test-Runner fuer die reinen Teile des News-Tickers.
//   npx tsx src/lib/newsTicker/__tests__/ticker.manual.ts

import { describeLlmError, parseGenerated } from "../parse";
import { addRefreshError, emptyRefreshStats, parseRefreshStats } from "../stats";
import { BACKGROUND_TASKS, isBackgroundTask } from "../../ai/types";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

// parseGenerated loggt Fehler per console.error — im Test stumm schalten.
const origError = console.error;
console.error = () => {};

section("parseGenerated");
{
  const item = parseGenerated('{"title":"T","teaser":"Te","summary":"S","category":"KI"}');
  ok("Voll-Item → item", item.kind === "item" && item.item.title === "T" && item.item.category === "KI");
  const fenced = parseGenerated('```json\n{"title":"T","teaser":"Te","summary":"S"}\n```');
  ok("Code-Fence wird entfernt, category fehlt → null", fenced.kind === "item" && fenced.item.category === null);
  ok("skip → skip", parseGenerated('{"skip": true}').kind === "skip");
  ok("skip hat Vorrang vor Feldern", parseGenerated('{"skip": true, "title":"T"}').kind === "skip");
  const bad = parseGenerated("kein json");
  ok("kein JSON → error mit Meldung", bad.kind === "error" && bad.message.includes("JSON"));
  const partial = parseGenerated('{"title":"T","teaser":""}');
  ok("unvollstaendig → error", partial.kind === "error" && partial.message.includes("unvollständig"));
  ok("JSON-String statt Objekt → error", parseGenerated('"hallo"').kind === "error");
  const rated = parseGenerated('{"title":"T","teaser":"Te","summary":"S","category":null,"einordnung":{"wirtschaft":3,"gesellschaft":1,"umwelt":0,"dringlichkeit":2,"wichtigkeit":3,"warum":"Betrifft Schweizer Banken direkt.","kehrseite":"Belege für den Zeitplan fehlen noch."}}');
  ok("Einordnung wird mitgelesen", rated.kind === "item" && rated.item.assessment?.wirtschaft === 3 && rated.item.importance === 3 && rated.item.assessment.by === "ai");
  const unrated = parseGenerated('{"title":"T","teaser":"Te","summary":"S","einordnung":{"wirtschaft":"viel"}}');
  ok("kaputte Einordnung → Item ohne Einordnung", unrated.kind === "item" && unrated.item.assessment === null && unrated.item.importance === null);
}

section("describeLlmError");
{
  ok("config → Konfiguration", describeLlmError("config", "not authenticated").includes("nicht konfiguriert"));
  ok("auth → Schlüssel abgelehnt", describeLlmError("auth", "").includes("abgelehnt"));
  ok("unknown → Kind und Meldung", describeLlmError("unknown", "provider call failed").includes("unknown: provider call failed"));
}

section("addRefreshError fasst gleiche Meldungen zusammen");
{
  const s = emptyRefreshStats();
  const a = { id: "a", name: "Quelle A" };
  const b = { id: "b", name: "Quelle B" };
  addRefreshError(s, a, "X");
  addRefreshError(s, a, "X");
  addRefreshError(s, a, "X");
  addRefreshError(s, a, "Y");
  addRefreshError(s, b, "X");
  ok("3 Eintraege (A/X, A/Y, B/X)", s.errors.length === 3, JSON.stringify(s.errors));
  ok("A/X zaehlt 3", s.errors[0].count === 3);
  ok("Einzelfehler ohne count", s.errors[1].count === undefined && s.errors[2].count === undefined);
  ok("emptyRefreshStats hat items_failed 0", emptyRefreshStats().items_failed === 0);
}

section("parseRefreshStats");
{
  ok("null → null", parseRefreshStats(null) === null);
  ok("Array → null", parseRefreshStats([]) === null);
  ok("fremdes Objekt → null", parseRefreshStats({ foo: 1 }) === null);
  const legacy = parseRefreshStats({
    errors: [], items_fetched: 20, sources_polled: 4, items_generated: 0, items_skipped_dedup: 0, items_skipped_generation: 20,
  });
  ok("Alt-Lauf ohne items_failed bleibt ohne Feld", legacy !== null && legacy.items_failed === undefined && legacy.items_skipped_generation === 20);
  const modern = parseRefreshStats({
    items_fetched: 5, sources_polled: 1, items_generated: 1, items_skipped_dedup: 0, items_skipped_generation: 1, items_failed: 3,
    errors: [{ source_id: "a", source_name: "A", message: "M", count: 3 }, { message: 42 }, "x"],
  });
  ok("neuer Lauf: items_failed 3", modern?.items_failed === 3);
  ok("kaputte Fehler-Eintraege werden verworfen", modern?.errors.length === 1 && modern.errors[0].count === 3);
  const paused = parseRefreshStats({ paused: true, errors: [] });
  ok("Pausen-Lauf erkannt", paused?.paused === true && paused.items_fetched === 0);
}

section("Hintergrund-Tasks");
{
  ok("News-Ticker ist Hintergrund-Task", isBackgroundTask("news_item_generation"));
  ok("SEO-Pipeline nicht", !isBackgroundTask("seo_pipeline"));
  ok("Liste ohne Komma/Klammer (PostgREST not.in)", BACKGROUND_TASKS.every((t) => !/[,()]/.test(t)));
}

console.error = origError;
process.stdout.write(`\n${passes} passed, ${fails} failed\n`);
if (fails > 0) process.exit(1);
