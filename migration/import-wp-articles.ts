// WordPress-Export → digital-age Articles-Migration.
//
// Ausführung:
//   npx tsx migration/import-wp-articles.ts <pfad-zur-xml> [--dry-run]
//
// Voraussetzungen:
//   - SUPABASE_URL (oder NEXT_PUBLIC_SUPABASE_URL) in der Env
//   - SUPABASE_SERVICE_ROLE_KEY in der Env (NIEMALS committen)
//
// `--dry-run` parst und resolved alles, schreibt aber NICHT in die DB.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { parseWPExport } from "./lib/xml-parser";
import { htmlToBlockDocument } from "./lib/html-to-blocks";
import { createAuthorResolver } from "./lib/author-resolver";
import {
  createCategoryResolver,
  pickPrimaryCategorySlug,
  WP_CATEGORY_MAP,
  unmappedCategories,
} from "./lib/category-resolver";
import { createLogger, type Counts } from "./lib/logger";
import type { Json } from "../src/lib/database.types";

function args() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const xmlPath = argv.find((a) => !a.startsWith("--"));
  if (!xmlPath) {
    process.stderr.write("Usage: tsx migration/import-wp-articles.ts <xml-path> [--dry-run]\n");
    process.exit(1);
  }
  return { xmlPath, dryRun };
}

function extractExcerpt(markdown: string, max = 200): string | null {
  const firstPara = markdown
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#") && !s.startsWith("![") && !s.startsWith("> "))
    .find(Boolean);
  if (!firstPara) return null;
  // Inline-Markdown grob strippen, damit keine **fett**-Reste reinrutschen
  const plain = firstPara
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

function parseDate(wpDate: string): string | null {
  if (!wpDate || wpDate === "0000-00-00 00:00:00") return null;
  // WP-Date ist UTC, Format "2024-01-15 10:30:00"
  const iso = wpDate.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function main() {
  const { xmlPath, dryRun } = args();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const logger = createLogger(`migration/logs/migration-${ts}.log`);

  logger.info(`XML: ${xmlPath}`);
  logger.info(`Dry-Run: ${dryRun ? "JA" : "NEIN"}`);

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    logger.fail("SUPABASE_URL und/oder SUPABASE_SERVICE_ROLE_KEY fehlen in der Env.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const exp = parseWPExport(xmlPath);
  logger.info(`Geparst: ${exp.posts.length} Posts, ${exp.attachmentsById.size} Attachments`);

  // Pre-Check: Unmappped Categories?
  const allWpCats = new Set<string>();
  for (const p of exp.posts) for (const c of p.categories) allWpCats.add(c);
  const unmapped = unmappedCategories(allWpCats);
  if (unmapped.length > 0) {
    logger.warn(`Unbekannte WP-Categories (fallen auf future-tech zurück): ${unmapped.join(", ")}`);
  }
  logger.info(`Category-Map: ${Object.entries(WP_CATEGORY_MAP).map(([k, v]) => `${k}→${v ?? "(skip)"}`).join(", ")}`);

  // Pre-Check: missing Authors (Eskalation falls > 5)
  const authorResolver = createAuthorResolver(supabase);
  const missingAuthors: string[] = [];
  for (const p of exp.posts) {
    if (!p.authorEmail) {
      missingAuthors.push(`(no email) — ${p.title}`);
      continue;
    }
    const a = await authorResolver.resolve(p.authorEmail);
    if (!a) missingAuthors.push(`${p.authorEmail} — ${p.title}`);
  }
  if (missingAuthors.length > 0) {
    logger.warn(`Posts ohne match-baren Author: ${missingAuthors.length}`);
    for (const m of missingAuthors) logger.warn(`  - ${m}`);
  }
  if (missingAuthors.length > 5) {
    logger.fail(`Mehr als 5 Posts ohne match-baren Author (${missingAuthors.length}). STOPPEN.`);
    logger.summary({
      total: exp.posts.length,
      imported: 0,
      skippedExisting: 0,
      skippedNoAuthor: missingAuthors.length,
      skippedOther: 0,
      failed: 0,
    });
    process.exit(2);
  }

  const categoryResolver = createCategoryResolver(supabase);

  const counts: Counts = {
    total: exp.posts.length,
    imported: 0,
    skippedExisting: 0,
    skippedNoAuthor: 0,
    skippedOther: 0,
    failed: 0,
  };

  // Pro Post abarbeiten
  for (const post of exp.posts) {
    const label = `"${post.title}"`;

    if (!post.slug) {
      logger.skip(`${label} — kein Slug in WP`);
      counts.skippedOther++;
      continue;
    }

    if (!post.authorEmail) {
      logger.skip(`${label} — kein Author-Email`);
      counts.skippedNoAuthor++;
      continue;
    }

    const author = await authorResolver.resolve(post.authorEmail);
    if (!author) {
      logger.skip(`${label} — Author nicht gefunden: ${post.authorEmail}`);
      counts.skippedNoAuthor++;
      continue;
    }

    const categorySlug = pickPrimaryCategorySlug(post.categories);
    const categoryId = await categoryResolver.resolveSlugToId(categorySlug);
    if (!categoryId) {
      logger.fail(`${label} — Category '${categorySlug}' nicht in DB`);
      counts.failed++;
      continue;
    }

    // Idempotenz
    const { data: existing, error: existingErr } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", post.slug)
      .maybeSingle();
    if (existingErr) {
      logger.fail(`${label} — Existing-Check-Fehler: ${existingErr.message}`);
      counts.failed++;
      continue;
    }
    if (existing) {
      logger.skip(`${label} — Slug existiert bereits: ${post.slug}`);
      counts.skippedExisting++;
      continue;
    }

    // HTML → Markdown → Blocks
    let conversion;
    try {
      conversion = htmlToBlockDocument(post.contentHtml);
    } catch (err) {
      logger.fail(`${label} — Conversion-Fehler: ${err instanceof Error ? err.message : String(err)}`);
      counts.failed++;
      continue;
    }
    for (const w of conversion.warnings) logger.warn(`  ${label}: ${w}`);

    const excerpt =
      (post.excerpt && post.excerpt.trim()) ||
      extractExcerpt(conversion.markdown) ||
      null;

    // Optional: thumbnail-URL aus Attachments (Bilder-Migration ersetzt das später)
    const coverUrl = post.thumbnailId
      ? exp.attachmentsById.get(post.thumbnailId)?.url ?? null
      : null;

    const publishedAt = parseDate(post.postDateGmt);

    const insertRow = {
      title: post.title,
      slug: post.slug,
      category_id: categoryId,
      subcategory: null as string | null,
      author_id: author.id,
      status: "draft" as const,
      excerpt,
      body_md: conversion.markdown,
      body_blocks: conversion.doc as unknown as Json,
      cover_image_url: coverUrl,
      tags: post.tags,
      published_at: publishedAt,
      is_featured: false,
    };

    if (dryRun) {
      logger.ok(
        `${label} → DRY-RUN (${author.slug}, ${categorySlug}, tags=${post.tags.length}, words≈${conversion.markdown.split(/\s+/).filter(Boolean).length})`,
      );
      counts.imported++;
      continue;
    }

    const { error: insertErr } = await supabase
      .from("articles")
      .insert(insertRow);

    if (insertErr) {
      logger.fail(`${label} — Insert-Fehler: ${insertErr.message}`);
      counts.failed++;
      continue;
    }

    logger.ok(`${label} → ${author.slug} / ${categorySlug}`);
    counts.imported++;
  }

  logger.summary(counts);

  if (dryRun) {
    // Snapshot der ersten 3 konvertierten Bodies → optisch prüfen
    const sampleFile = `migration/logs/sample-bodies-${ts}.md`;
    const samples: string[] = [];
    for (const post of exp.posts.slice(0, 3)) {
      try {
        const { markdown } = htmlToBlockDocument(post.contentHtml);
        samples.push(`# ${post.title}\n\n_Slug: ${post.slug}_\n\n---\n\n${markdown}\n\n========\n`);
      } catch {
        // ignore
      }
    }
    writeFileSync(sampleFile, samples.join("\n"));
    logger.info(`Sample-Bodies (3 Stichproben): ${sampleFile}`);
  }

  process.exit(counts.failed > 0 ? 3 : 0);
}

main().catch((e) => {
  process.stderr.write(`Migration crashed: ${e instanceof Error ? e.stack : e}\n`);
  process.exit(99);
});
