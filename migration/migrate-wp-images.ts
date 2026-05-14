// WP-Bilder → Supabase Storage Migration.
//
// Lädt jedes Bild von `https://digital-age.ch/wp-content/uploads/...` herunter
// und schreibt es ins Storage-Bucket `articles` unter `{article_id}/{filename}`.
// Aktualisiert `articles.cover_image_url` plus image- und
// internalArticleCard-Block-URLs im `body_blocks`-JSONB.
//
// Ausführung:
//   npx tsx migration/migrate-wp-images.ts [--dry-run]
//
// Voraussetzungen:
//   - SUPABASE_URL (oder NEXT_PUBLIC_SUPABASE_URL) in der Env
//   - SUPABASE_SERVICE_ROLE_KEY in der Env (NIEMALS committen)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { createLogger } from "./lib/logger";
import type { Block, BlockDocument } from "../src/types/blocks";

const WP_PREFIX = "https://digital-age.ch/wp-content/uploads/";
const BUCKET = "articles";
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type Stats = {
  articlesScanned: number;
  articlesUpdated: number;
  imagesMigrated: number;
  imagesSkippedExisting: number;
  imagesFailed: number;
  imagesNonWp: number;
};

function args() {
  const argv = process.argv.slice(2);
  return { dryRun: argv.includes("--dry-run") };
}

// Slugifier für Filenames: lowercase, Umlaute translit, Sonderzeichen → `-`,
// WP-Grössen-Suffixe (`-1024x576`) raus, Extension separat.
function slugifyFilename(originalUrl: string): string {
  const lastSeg = originalUrl.split("/").pop() ?? "image";
  const [, name = "image", ext = ""] = lastSeg.match(/^(.+?)\.([a-z0-9]+)$/i) ?? [];
  let cleanName = name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
  // WP-Grössen-Suffix: `-1024x576`
  cleanName = cleanName.replace(/-\d+x\d+$/i, "");
  // Sonderzeichen → -
  cleanName = cleanName.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!cleanName) cleanName = "image";
  const cleanExt = (ext || "jpg").toLowerCase();
  return `${cleanName}.${cleanExt}`;
}

// Holt das Public-URL-Prefix für unser Bucket aus der Supabase-URL.
function storageBase(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}`;
}

type ImageMigrator = {
  migrate(articleId: string, url: string): Promise<{ newUrl: string; status: "migrated" | "skipped-existing" | "non-wp" }>;
  stats: { migrated: number; skippedExisting: number; failed: number; nonWp: number };
};

function createImageMigrator(
  supabase: SupabaseClient,
  supabaseUrl: string,
  dryRun: boolean,
  logger: ReturnType<typeof createLogger>,
): ImageMigrator {
  const base = storageBase(supabaseUrl);
  // Per-Article-Listing-Cache (statt jede einzelne Datei abzufragen)
  const folderCache = new Map<string, Set<string>>();
  const stats = { migrated: 0, skippedExisting: 0, failed: 0, nonWp: 0 };

  async function getFolderFiles(articleId: string): Promise<Set<string>> {
    if (folderCache.has(articleId)) return folderCache.get(articleId)!;
    const { data } = await supabase.storage.from(BUCKET).list(articleId, { limit: 1000 });
    const names = new Set((data ?? []).map((e) => e.name));
    folderCache.set(articleId, names);
    return names;
  }

  async function migrate(articleId: string, url: string) {
    if (!url || !url.startsWith(WP_PREFIX)) {
      stats.nonWp++;
      return { newUrl: url, status: "non-wp" as const };
    }
    const filename = slugifyFilename(url);
    const storagePath = `${articleId}/${filename}`;
    const newUrl = `${base}/${storagePath}`;

    const existing = await getFolderFiles(articleId);
    if (existing.has(filename)) {
      stats.skippedExisting++;
      logger.info(`  SKIP-EXISTS  ${storagePath}`);
      return { newUrl, status: "skipped-existing" as const };
    }

    if (dryRun) {
      logger.info(`  DRY-UPLOAD   ${storagePath}  (from ${url})`);
      stats.migrated++;
      return { newUrl, status: "migrated" as const };
    }

    let resp: Response;
    try {
      resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
    } catch (err) {
      stats.failed++;
      logger.fail(`  download_error  ${url}: ${err instanceof Error ? err.message : err}`);
      throw new Error("download_error");
    }
    if (!resp.ok) {
      stats.failed++;
      logger.fail(`  download_${resp.status}  ${url}`);
      throw new Error(`download_${resp.status}`);
    }
    const contentType = (resp.headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim();
    if (contentType && !ALLOWED_MIMES.has(contentType)) {
      stats.failed++;
      logger.fail(`  unknown_extension  ${url} (Content-Type: ${contentType})`);
      throw new Error("unknown_extension");
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
      contentType: contentType || "application/octet-stream",
      upsert: false,
    });
    if (error) {
      stats.failed++;
      logger.fail(`  upload_failed  ${storagePath}: ${error.message}`);
      throw new Error("upload_failed");
    }
    existing.add(filename);
    stats.migrated++;
    logger.ok(`  ${storagePath}  (${buf.length.toLocaleString()} bytes)`);
    return { newUrl, status: "migrated" as const };
  }

  return { migrate, stats };
}

// Tief durch ein BlockDocument iterieren und URLs in image/internalArticleCard
// rebasen. Gibt ein neues Doc + Flag changed zurück.
async function migrateDocImages(
  doc: BlockDocument,
  articleId: string,
  migrator: ImageMigrator,
): Promise<{ doc: BlockDocument; changed: boolean }> {
  let changed = false;
  const newBlocks: Block[] = [];
  for (const b of doc.blocks) {
    if (b.type === "image" && b.url?.startsWith(WP_PREFIX)) {
      try {
        const { newUrl } = await migrator.migrate(articleId, b.url);
        newBlocks.push({ ...b, url: newUrl });
        changed = true;
      } catch {
        newBlocks.push(b); // Original behalten bei Fehler
      }
    } else if (
      b.type === "internalArticleCard" &&
      b.cachedCoverUrl?.startsWith(WP_PREFIX)
    ) {
      try {
        const { newUrl } = await migrator.migrate(articleId, b.cachedCoverUrl);
        newBlocks.push({ ...b, cachedCoverUrl: newUrl });
        changed = true;
      } catch {
        newBlocks.push(b);
      }
    } else {
      newBlocks.push(b);
    }
  }
  return { doc: { ...doc, blocks: newBlocks }, changed };
}

async function main() {
  const { dryRun } = args();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const logger = createLogger(`migration/logs/image-migration-${ts}.log`);

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

  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, slug, cover_image_url, body_blocks")
    .eq("status", "published");

  if (error) {
    logger.fail(`Article-Query-Fehler: ${error.message}`);
    process.exit(1);
  }

  const list = articles ?? [];
  logger.info(`Articles published: ${list.length}`);

  // Pre-Count: wieviele WP-Bilder sind das insgesamt?
  let totalImages = 0;
  for (const a of list) {
    if (typeof a.cover_image_url === "string" && a.cover_image_url.startsWith(WP_PREFIX)) totalImages++;
    const doc = a.body_blocks as unknown as BlockDocument | null;
    if (!doc?.blocks) continue;
    for (const b of doc.blocks) {
      if (b.type === "image" && typeof b.url === "string" && b.url.startsWith(WP_PREFIX)) totalImages++;
      if (b.type === "internalArticleCard" && typeof b.cachedCoverUrl === "string" && b.cachedCoverUrl.startsWith(WP_PREFIX)) totalImages++;
    }
  }
  logger.info(`Geschätzte Anzahl Bilder (WP-Prefix): ${totalImages}`);

  // Bestätigung im echten Run
  if (!dryRun) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    logger.warn(`Du wirst jetzt ${list.length} Artikel bearbeiten.`);
    logger.warn(`Geschätzte Anzahl Bilder: ${totalImages}`);
    logger.warn(`Original-WP-URLs bleiben bei Fehlern erhalten (kein Daten-Verlust).`);
    const a = await rl.question("Fortfahren? Gib 'JA' ein: ");
    rl.close();
    if (a.trim() !== "JA") {
      logger.info("Abgebrochen vom User.");
      process.exit(0);
    }
  }

  const migrator = createImageMigrator(supabase, url, dryRun, logger);
  const stats: Stats = {
    articlesScanned: 0,
    articlesUpdated: 0,
    imagesMigrated: 0,
    imagesSkippedExisting: 0,
    imagesFailed: 0,
    imagesNonWp: 0,
  };

  // Sample-Articles für detaillierten Output (max 3 mit Bildern)
  const sampleQuota = 3;
  let samplesPrinted = 0;

  for (const article of list) {
    stats.articlesScanned++;
    const label = `"${article.slug}"`;
    const beforeMigrated = migrator.stats.migrated + migrator.stats.skippedExisting;

    let newCover = article.cover_image_url as string | null;
    let coverChanged = false;
    if (typeof article.cover_image_url === "string" && article.cover_image_url.startsWith(WP_PREFIX)) {
      try {
        const r = await migrator.migrate(article.id, article.cover_image_url);
        if (r.status !== "non-wp" && r.newUrl !== article.cover_image_url) {
          newCover = r.newUrl;
          coverChanged = true;
        }
      } catch {
        // Original behalten
      }
    }

    let docResult: { doc: BlockDocument; changed: boolean } | null = null;
    const docCurrent = article.body_blocks as unknown as BlockDocument | null;
    if (docCurrent?.blocks) {
      docResult = await migrateDocImages(docCurrent, article.id, migrator);
    }

    const changed = coverChanged || docResult?.changed === true;

    if (changed) {
      stats.articlesUpdated++;
      if (!dryRun) {
        const patch: { cover_image_url?: string | null; body_blocks?: BlockDocument } = {};
        if (coverChanged) patch.cover_image_url = newCover;
        if (docResult?.changed) patch.body_blocks = docResult.doc;
        const { error: updateErr } = await supabase
          .from("articles")
          .update(patch)
          .eq("id", article.id);
        if (updateErr) {
          logger.fail(`${label} DB-Update-Fehler: ${updateErr.message}`);
        }
      }
      logger.ok(`${label} updated`);
    }

    const afterMigrated = migrator.stats.migrated + migrator.stats.skippedExisting;
    const hadImages = afterMigrated - beforeMigrated > 0;
    if (hadImages && samplesPrinted < sampleQuota && dryRun) {
      samplesPrinted++;
    }
  }

  stats.imagesMigrated = migrator.stats.migrated;
  stats.imagesSkippedExisting = migrator.stats.skippedExisting;
  stats.imagesFailed = migrator.stats.failed;
  stats.imagesNonWp = migrator.stats.nonWp;

  logger.info("");
  logger.info("═══════════════════════════════════");
  logger.info("Bilder-Migration abgeschlossen");
  logger.info("═══════════════════════════════════");
  logger.info(`Artikel gescannt:        ${stats.articlesScanned}`);
  logger.info(`Artikel mit Updates:     ${stats.articlesUpdated}`);
  logger.info(`Bilder migriert:         ${stats.imagesMigrated}`);
  logger.info(`Bereits vorhanden:       ${stats.imagesSkippedExisting}`);
  logger.info(`Fehler/Skipped:          ${stats.imagesFailed}`);
  logger.info(`Non-WP-URLs übersprungen:${stats.imagesNonWp}`);
  logger.info("───────────────────────────────────");
  logger.info(`Volles Log: ${logger.filePath}`);

  process.exit(stats.imagesFailed > 0 ? 3 : 0);
}

main().catch((e) => {
  process.stderr.write(`Image-Migration crashed: ${e instanceof Error ? e.stack : e}\n`);
  process.exit(99);
});
