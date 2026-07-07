// Manueller Test-Runner fuer src/lib/revisionSnapshot.ts.
//   npx tsx src/lib/__tests__/revisionSnapshot.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.

import {
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
    "cover_image_url", "category_id", "subcategory", "tags", "locale", "subtitle"]) {
    ok(`enthaelt ${f}`, set.has(f));
  }
  // Bewusst NICHT enthalten.
  for (const f of ["status", "seo_review", "seo_review_at", "is_featured",
    "is_hero", "published_at", "word_count", "updated_at", "id", "author_id"]) {
    ok(`enthaelt NICHT ${f}`, !set.has(f));
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
