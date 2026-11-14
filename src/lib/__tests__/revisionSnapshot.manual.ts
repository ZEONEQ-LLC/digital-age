// Manueller Test-Runner fuer src/lib/revisionSnapshot.ts.
//   npx tsx src/lib/__tests__/revisionSnapshot.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.

import { readFileSync } from "node:fs";
import {
  REVISION_NOT_RESTORED_FIELDS,
  REVISION_SNAPSHOT_FIELDS,
  shouldRestoreSlug,
  revisionTypeOf,
  isRestorable,
  isPartialRevision,
} from "../revisionSnapshot";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

section("REVISION_SNAPSHOT_FIELDS — Inhalt");
{
  const set = new Set<string>(REVISION_SNAPSHOT_FIELDS);
  for (const f of ["title", "body_blocks", "body_md", "excerpt", "slug",
    "seo_title", "seo_description", "seo_keyword_primary", "seo_keywords_secondary",
    "cover_image_url", "category_id", "subcategory", "tags", "locale", "subtitle",
    "og_image_url", "cover_video_url", "cover_video_alt", "cover_recipe"]) {
    ok(`enthaelt ${f}`, set.has(f));
  }
  // Bewusst NICHT enthalten.
  for (const f of ["status", "seo_review", "seo_review_at", "is_featured",
    "is_hero", "published_at", "word_count", "updated_at", "id", "author_id",
    "copilot_last_run", "cover_proposals"]) {
    ok(`enthaelt NICHT ${f}`, !set.has(f));
  }
}

section("Einordnung: im Snapshot, nie restauriert (Showcase S2a)");
{
  const set = new Set<string>(REVISION_SNAPSHOT_FIELDS);
  for (const f of REVISION_NOT_RESTORED_FIELDS) ok(`Snapshot enthaelt ${f}`, set.has(f));
  ok("genau drei Felder", REVISION_NOT_RESTORED_FIELDS.join(",") === "content_type,startup_id,is_paid");

  // Die SQL-Seite ist die ausfuehrende Quelle: Die juengste Migration mit
  // article_editorial_snapshot muss jedes Feld der Liste enthalten, und das
  // Restore darf die Einordnung nicht setzen.
  const sql = readFileSync("supabase/migrations/20261114140000_showcase_datenmodell.sql", "utf8");
  const snapStart = sql.indexOf("function public.article_editorial_snapshot");
  const snapBody = sql.slice(snapStart, sql.indexOf("$fn$;", snapStart));
  for (const f of REVISION_SNAPSHOT_FIELDS) ok(`SQL-Snapshot enthaelt '${f}'`, snapBody.includes(`'${f}'`));
  const keys = snapBody.match(/'[a-z_]+', /g) ?? [];
  ok("SQL-Snapshot hat keine zusaetzlichen Felder", keys.length === REVISION_SNAPSHOT_FIELDS.length, `SQL ${keys.length}, Liste ${REVISION_SNAPSHOT_FIELDS.length}`);

  const restoreStart = sql.indexOf("function public.restore_article_revision");
  const restoreBody = sql.slice(restoreStart, sql.indexOf("$fn$;", restoreStart));
  const updateStart = restoreBody.indexOf("update public.articles set");
  const updateBody = restoreBody.slice(updateStart, restoreBody.indexOf("where id = p_article_id", updateStart));
  for (const f of REVISION_NOT_RESTORED_FIELDS) {
    ok(`Restore setzt ${f} nicht`, !new RegExp(`\\n\\s+${f}\\s+=`).test(updateBody));
  }
  ok("Restore laesst die Kategorie eines Unternehmensbeitrags stehen", updateBody.includes("when content_type = 'company' then category_id"));

  const trigStart = sql.indexOf("function public.create_article_revision");
  const trigBody = sql.slice(trigStart, sql.indexOf("$fn$;", trigStart));
  for (const f of REVISION_SNAPSHOT_FIELDS) {
    ok(`Wechsel von ${f} erzeugt eine Revision`, new RegExp(`old\\.${f}\\s+is distinct from new\\.${f}`).test(trigBody));
  }
}

section("shouldRestoreSlug");
{
  ok("jemals publiziert → Slug NICHT restaurieren", shouldRestoreSlug(true) === false);
  ok("nie publiziert → Slug restaurieren", shouldRestoreSlug(false) === true);
}

section("revisionTypeOf");
{
  ok("default → content", revisionTypeOf({}) === "content");
  ok("null → content", revisionTypeOf({ revision_type: null }) === "content");
  ok("unbekannt → content", revisionTypeOf({ revision_type: "weird" }) === "content");
  ok("status_change", revisionTypeOf({ revision_type: "status_change" }) === "status_change");
  ok("restore", revisionTypeOf({ revision_type: "restore" }) === "restore");
}

section("isRestorable");
{
  ok("content + Snapshot → restaurierbar",
    isRestorable({ revision_type: "content", snapshot: { title: "x" } }) === true);
  ok("content + nur body_md (Alt) → restaurierbar",
    isRestorable({ revision_type: "content", snapshot: null, body_md_snapshot: "# Hallo" }) === true);
  ok("restore + Snapshot → restaurierbar (Undo)",
    isRestorable({ revision_type: "restore", snapshot: { title: "x" } }) === true);
  ok("status_change → NICHT restaurierbar",
    isRestorable({ revision_type: "status_change", snapshot: null, body_md_snapshot: null }) === false);
  ok("content ohne Snapshot ohne body_md → NICHT restaurierbar",
    isRestorable({ revision_type: "content", snapshot: null, body_md_snapshot: "" }) === false);
}

section("isPartialRevision");
{
  ok("Alt-Revision (kein Snapshot, body_md) → partial",
    isPartialRevision({ revision_type: "content", snapshot: null, body_md_snapshot: "# H" }) === true);
  ok("voller Snapshot → NICHT partial",
    isPartialRevision({ revision_type: "content", snapshot: { title: "x" } }) === false);
  ok("status_change → NICHT partial (nicht restaurierbar)",
    isPartialRevision({ revision_type: "status_change", snapshot: null }) === false);
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);
