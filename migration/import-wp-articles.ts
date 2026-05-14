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
import { createInterface } from "node:readline/promises";
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

  // Sicherheitsabfrage bei nicht-leerer Drafts-Tabelle (nur im echten Run).
  // Idempotenz schützt nur bei gleichem Slug — alles andere bleibt liegen.
  if (!dryRun) {
    const { count: existingDrafts } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft");
    if ((existingDrafts ?? 0) > 0) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      logger.warn(`Aktuell ${existingDrafts} Drafts in der DB. Migration löscht sie NICHT automatisch.`);
      logger.warn(`Falls die alle aus der vorigen Migration sind, manuell löschen:`);
      logger.warn(`  npx supabase db query --linked "delete from articles where status = 'draft';"`);
      const answer = await rl.question("Fortfahren mit Migration trotz vorhandener Drafts? (y/N) ");
      rl.close();
      if (answer.trim().toLowerCase() !== "y") {
        logger.info("Abgebrochen vom User.");
        process.exit(0);
      }
    }
  }

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

    // Excerpt zuerst — wird zum Strip-Vergleich an die Conversion mitgegeben
    const preliminaryExcerpt = post.excerpt && post.excerpt.trim() ? post.excerpt.trim() : "";

    // HTML → Markdown → Blocks
    let conversion;
    try {
      conversion = htmlToBlockDocument(post.contentHtml, {
        title: post.title,
        excerpt: preliminaryExcerpt,
      });
    } catch (err) {
      logger.fail(`${label} — Conversion-Fehler: ${err instanceof Error ? err.message : String(err)}`);
      counts.failed++;
      continue;
    }
    for (const w of conversion.warnings) logger.warn(`  ${label}: ${w}`);
    logger.info(
      `  ${label} stats: sources=${conversion.stats.sourcesMapped}/${conversion.stats.sourcesFound}, ` +
        `hl=g${conversion.stats.highlightsGreen}/o${conversion.stats.highlightsOrange}, ` +
        `disclaimer=${conversion.stats.disclaimerAttached ? conversion.stats.disclaimerLanguage : "no"}, ` +
        `excerpt-strip=${conversion.stats.excerptStripped ? "yes" : "no"}, ` +
        `dividers-norm=${conversion.stats.dividersNormalized}`,
    );

    // V3: Excerpts werden NICHT migriert. User pflegt sie manuell im Editor
    // via "Zusammenfassung erstellen"-Button beim Polishen.
    const excerpt = null;

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
    // Sample-Stichproben: 1 mit Sources, 1 mit Highlights, 1 mit Disclaimer
    const sampleFile = `migration/logs/sample-bodies-${ts}.md`;
    const samples: string[] = [];

    const sourcesCandidate = exp.posts.find((p) => /#sources/i.test(p.contentHtml));
    const highlightCandidate = exp.posts.find(
      (p) => p.contentHtml.includes("<mark") && p !== sourcesCandidate,
    );
    const disclaimerCandidate = exp.posts.find(
      (p) =>
        /wp:block\s*\{[^}]*"ref":\s*1915\b/.test(p.contentHtml) &&
        p !== sourcesCandidate &&
        p !== highlightCandidate,
    );
    const picks = [sourcesCandidate, highlightCandidate, disclaimerCandidate].filter(
      (p): p is (typeof exp.posts)[number] => !!p,
    );

    for (const post of picks) {
      try {
        const conv = htmlToBlockDocument(post.contentHtml, {
          title: post.title,
          excerpt: post.excerpt && post.excerpt.trim() ? post.excerpt.trim() : "",
        });
        const firstBlock = conv.doc.blocks[0];
        const lastBlock = conv.doc.blocks[conv.doc.blocks.length - 1];
        const summary = [
          `Artikel: ${post.title}`,
          `─────────────────────────────────────`,
          `Source-Refs/URLs mapped:  ${conv.stats.sourcesMapped} / ${conv.stats.sourcesFound}`,
          `Highlights:               grün ${conv.stats.highlightsGreen}, orange ${conv.stats.highlightsOrange}`,
          `Disclaimer-Block:         ${conv.stats.disclaimerAttached ? `ja (${conv.stats.disclaimerLanguage}, via ${conv.stats.disclaimerVia})` : "nein"}`,
          `Excerpt-Strip:            ${conv.stats.excerptStripped ? "ja" : "nein"}`,
          `Divider normalisiert:     ${conv.stats.dividersNormalized}`,
          ``,
          `Erster Block (preview):`,
          `  type: "${firstBlock?.type ?? "—"}"`,
          firstBlock && "content" in firstBlock
            ? `  content: ${JSON.stringify(firstBlock.content.slice(0, 140))}…`
            : `  (kein content-Feld)`,
          ``,
          `Letzter Block (preview):`,
          `  type: "${lastBlock?.type ?? "—"}"`,
          lastBlock?.type === "disclaimer"
            ? `  text:     "${lastBlock.text}"\n  linkText: "${lastBlock.linkText ?? ""}"\n  linkUrl:  "${lastBlock.linkUrl ?? ""}"`
            : lastBlock && "content" in lastBlock
              ? `  content: ${JSON.stringify(lastBlock.content.slice(0, 140))}…`
              : `  (kein content-Feld)`,
          ``,
          `========`,
        ].join("\n");
        samples.push(summary);
        // Auch nach stdout für direkten User-Review
        logger.info("\n" + summary);
      } catch (err) {
        logger.fail(`Sample-Conversion crashed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    writeFileSync(sampleFile, samples.join("\n\n"));
    logger.info(`Sample-Bodies (${picks.length} Stichproben): ${sampleFile}`);
  }

  process.exit(counts.failed > 0 ? 3 : 0);
}

main().catch((e) => {
  process.stderr.write(`Migration crashed: ${e instanceof Error ? e.stack : e}\n`);
  process.exit(99);
});
