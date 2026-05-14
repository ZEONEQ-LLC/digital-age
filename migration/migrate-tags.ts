// Tag-System-Migration (Phase T1).
//
// Zwei Phasen:
//   --export  → liest articles.tags[], schreibt migration/tag-export.json
//               (sortiert nach Häufigkeit DESC, dann alphabetisch)
//   --apply   → liest migration/tag-export.json + migration/tag-merge-mapping.json,
//               legt tags-Rows an, befüllt article_tags-Junction
//
// User-Workflow:
//   1. `npx tsx migration/migrate-tags.ts --export`
//   2. tag-export.json reviewen, tag-merge-mapping.json hand-curated anlegen
//   3. `npx tsx migration/migrate-tags.ts --apply`
//
// Voraussetzungen (Env):
//   - SUPABASE_URL (oder NEXT_PUBLIC_SUPABASE_URL)
//   - SUPABASE_SERVICE_ROLE_KEY (NIEMALS committen)

import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import { createLogger } from "./lib/logger";

const EXPORT_PATH = "migration/tag-export.json";
const MAPPING_PATH = "migration/tag-merge-mapping.json";

type ExportEntry = { original: string; slug: string; count: number };
type MergeMapping = Record<string, string>;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/&/g, "und")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    process.stderr.write("SUPABASE_URL und/oder SUPABASE_SERVICE_ROLE_KEY fehlen.\n");
    process.exit(1);
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function runExport() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const logger = createLogger(`migration/logs/tag-migration-export-${ts}.log`);
  const supabase = getSupabase();

  logger.info("Lade articles.tags …");
  const { data, error } = await supabase
    .from("articles")
    .select("id, tags");
  if (error) {
    logger.fail(`Article-Query-Fehler: ${error.message}`);
    process.exit(1);
  }

  const occurrences = new Map<string, number>();
  for (const row of data ?? []) {
    const tags = (row.tags as string[] | null) ?? [];
    for (const t of tags) {
      const trimmed = t.trim();
      if (!trimmed) continue;
      occurrences.set(trimmed, (occurrences.get(trimmed) ?? 0) + 1);
    }
  }

  const sorted = Array.from(occurrences.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  const exportData: ExportEntry[] = sorted.map(([original, count]) => ({
    original,
    slug: slugify(original),
    count,
  }));

  await fs.writeFile(EXPORT_PATH, JSON.stringify(exportData, null, 2));

  logger.info("");
  logger.info(`Exportiert: ${exportData.length} eindeutige Tags`);
  logger.info(`Datei:      ${EXPORT_PATH}`);
  logger.info("");
  logger.info("Top 10 nach Häufigkeit:");
  for (const e of exportData.slice(0, 10)) {
    logger.info(`  ${String(e.count).padStart(3)}× ${e.original}  (slug: ${e.slug})`);
  }
  logger.info("");
  logger.info("NÄCHSTE SCHRITTE für den User:");
  logger.info("  1. tag-export.json durchsehen");
  logger.info("  2. tag-merge-mapping.json anlegen mit Merges, z.B.:");
  logger.info("     { \"KI\": \"AI\", \"ai agents\": \"Agentic AI\" }");
  logger.info("     Tags ohne Eintrag bleiben unverändert.");
  logger.info("  3. `npx tsx migration/migrate-tags.ts --apply` ausführen");
}

async function runApply() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const logger = createLogger(`migration/logs/tag-migration-apply-${ts}.log`);
  const supabase = getSupabase();

  let exportData: ExportEntry[];
  let mapping: MergeMapping;
  try {
    exportData = JSON.parse(await fs.readFile(EXPORT_PATH, "utf-8"));
  } catch (e) {
    logger.fail(`Export-Datei nicht lesbar: ${EXPORT_PATH} — ${e instanceof Error ? e.message : e}`);
    logger.fail("Erst `--export` ausführen.");
    process.exit(1);
  }
  try {
    mapping = JSON.parse(await fs.readFile(MAPPING_PATH, "utf-8"));
  } catch (e) {
    logger.warn(`Mapping-Datei nicht gefunden: ${MAPPING_PATH}. Verwende leeres Mapping (alle Tags 1:1).`);
    mapping = {};
    if (e instanceof Error && !e.message.includes("ENOENT")) {
      logger.fail(`Mapping-Parse-Fehler: ${e.message}`);
      process.exit(1);
    }
  }

  // Build final tag-set: original → mapped name → slug
  const finalTags = new Map<string, { name: string; originalTags: string[] }>();
  for (const { original } of exportData) {
    const mappedName = mapping[original] ?? original;
    const slug = slugify(mappedName);
    const entry = finalTags.get(slug);
    if (entry) {
      entry.originalTags.push(original);
    } else {
      finalTags.set(slug, { name: mappedName, originalTags: [original] });
    }
  }

  logger.info(`Mapping-Resultat: ${exportData.length} Original-Tags → ${finalTags.size} Final-Tags`);

  // Upsert tags
  const tagRows = Array.from(finalTags.entries()).map(([slug, { name }]) => ({
    slug,
    name,
  }));
  const { error: tagErr } = await supabase
    .from("tags")
    .upsert(tagRows, { onConflict: "slug" });
  if (tagErr) {
    logger.fail(`Tag-Upsert fehlgeschlagen: ${tagErr.message}`);
    process.exit(1);
  }
  logger.ok(`${tagRows.length} Tags upserted`);

  // Lade alle tag-IDs nach slug
  const { data: dbTags } = await supabase.from("tags").select("id, slug");
  const tagIdBySlug = new Map<string, string>(
    (dbTags ?? []).map((t) => [t.slug, t.id]),
  );

  // Junction aufbauen: pro Article die unique slugs erzeugen, dann insert
  const { data: articles } = await supabase
    .from("articles")
    .select("id, tags");

  // Reverse-Lookup für `articles.tags[]`-Rewrite: slug → canonical name.
  // Damit die alte Array-Spalte nach dem Apply die gemergten Namen führt.
  const canonicalNameBySlug = new Map<string, string>(
    Array.from(finalTags.entries()).map(([slug, { name }]) => [slug, name]),
  );

  let junctionsAdded = 0;
  let articlesProcessed = 0;
  let arrayRewrites = 0;
  for (const article of articles ?? []) {
    const tags = (article.tags as string[] | null) ?? [];
    if (tags.length === 0) continue;
    const slugs = new Set<string>();
    for (const t of tags) {
      const trimmed = t.trim();
      if (!trimmed) continue;
      const mappedName = mapping[trimmed] ?? trimmed;
      slugs.add(slugify(mappedName));
    }
    const tagIds = Array.from(slugs)
      .map((s) => tagIdBySlug.get(s))
      .filter((v): v is string => !!v);
    if (tagIds.length === 0) continue;

    const rows = tagIds.map((tagId) => ({
      article_id: article.id,
      tag_id: tagId,
    }));
    const { error: junctionErr } = await supabase
      .from("article_tags")
      .upsert(rows, { onConflict: "article_id,tag_id", ignoreDuplicates: true });
    if (junctionErr) {
      logger.fail(`Junction-Insert für ${article.id} fehlgeschlagen: ${junctionErr.message}`);
      continue;
    }
    junctionsAdded += rows.length;
    articlesProcessed++;

    // Backwards-Compat: articles.tags[] auf kanonische Namen umschreiben.
    // Reihenfolge wird stabilisiert (slug-sortiert), Duplikate eliminiert.
    const canonicalNames = Array.from(slugs)
      .map((s) => canonicalNameBySlug.get(s))
      .filter((v): v is string => !!v)
      .sort();
    const oldNames = [...tags].sort();
    if (JSON.stringify(canonicalNames) !== JSON.stringify(oldNames)) {
      const { error: rewriteErr } = await supabase
        .from("articles")
        .update({ tags: canonicalNames })
        .eq("id", article.id);
      if (rewriteErr) {
        logger.fail(`Tags-Rewrite für ${article.id} fehlgeschlagen: ${rewriteErr.message}`);
      } else {
        arrayRewrites++;
      }
    }
  }

  logger.info("");
  logger.info("═══════════════════════════════════");
  logger.info("Tag-Migration abgeschlossen");
  logger.info("═══════════════════════════════════");
  logger.info(`Original-Tags:                ${exportData.length}`);
  logger.info(`Nach Merge:                    ${finalTags.size}`);
  logger.info(`Articles mit Tags verarbeitet: ${articlesProcessed}`);
  logger.info(`Junction-Rows angelegt:        ${junctionsAdded}`);
  logger.info(`articles.tags[] kanonisiert:   ${arrayRewrites}`);
}

const argv = process.argv.slice(2);
if (argv.includes("--export")) {
  void runExport();
} else if (argv.includes("--apply")) {
  void runApply();
} else {
  process.stderr.write(
    "Usage: tsx migration/migrate-tags.ts (--export | --apply)\n",
  );
  process.exit(1);
}
