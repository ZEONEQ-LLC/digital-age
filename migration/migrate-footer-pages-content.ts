// Footer-Pages Content-Migration.
//
// Liest .md-Files aus migration/footer-pages-content/, parsed sie zu
// BlockDocument via markdownToBlocks und UPDATEt public.pages.body_blocks
// (+ optional lead) für den jeweiligen Slug.
//
// Slug wird aus dem Dateinamen abgeleitet: redaktion.md → slug 'redaktion'.
//
// Optionales YAML-Frontmatter (`---\nlead: …\n---`) setzt zusätzlich die
// `lead`-Spalte; ohne Frontmatter bleibt der vorhandene Wert unverändert.
//
// Ausführung:
//   npx tsx migration/migrate-footer-pages-content.ts            # Dry-Run
//   npx tsx migration/migrate-footer-pages-content.ts --apply    # Live
//
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { markdownToBlocks } from "../src/lib/markdownBlocks";
import { BLOCK_SCHEMA_VERSION } from "../src/types/blocks";
import { createLogger } from "./lib/logger";

const CONTENT_DIR = "migration/footer-pages-content";
const LOG_PATH = `migration/logs/migrate-footer-pages-${new Date()
  .toISOString()
  .replace(/[:.]/g, "-")}.log`;

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Env-Var ${key} fehlt.`);
  return v;
}

function args() {
  return { apply: process.argv.slice(2).includes("--apply") };
}

type ParsedFile = {
  slug: string;
  lead?: string;
  body: string;
};

function parseFile(path: string): ParsedFile {
  const slug = basename(path, ".md");
  const raw = readFileSync(path, "utf-8");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return { slug, body: raw };
  const fm = fmMatch[1];
  const body = fmMatch[2];
  const leadLine = fm.match(/^lead:\s*(.+)$/m);
  return {
    slug,
    lead: leadLine ? leadLine[1].trim() : undefined,
    body,
  };
}

async function main() {
  const log = createLogger(LOG_PATH);
  const { apply } = args();
  log.info(apply ? "Modus: LIVE (--apply)" : "Modus: DRY-RUN");

  const supabaseUrl = env("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const files = readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(CONTENT_DIR, f))
    .sort();
  log.info(`Gefundene Markdown-Files: ${files.length}`);
  for (const f of files) log.info(`  ${f}`);
  log.info("");

  const parsed = files.map(parseFile);

  // Bestehende Slugs aus DB lesen
  const { data: existing, error: existingErr } = await supabase
    .from("pages")
    .select("slug, lead");
  if (existingErr) {
    log.fail(`Pages-Read fehlgeschlagen: ${existingErr.message}`);
    process.exit(2);
  }
  const existingMap = new Map(
    (existing ?? []).map((r) => [r.slug, r.lead as string | null]),
  );

  // Plan
  type Plan = {
    slug: string;
    blockCount: number;
    leadChange?: { from: string | null; to: string };
    notFound?: boolean;
  };
  const plan: Plan[] = [];
  for (const p of parsed) {
    if (!existingMap.has(p.slug)) {
      plan.push({ slug: p.slug, blockCount: 0, notFound: true });
      continue;
    }
    const blocks = markdownToBlocks(p.body);
    const currentLead = existingMap.get(p.slug) ?? null;
    const leadChange =
      p.lead !== undefined && p.lead !== currentLead
        ? { from: currentLead, to: p.lead }
        : undefined;
    plan.push({ slug: p.slug, blockCount: blocks.length, leadChange });
  }

  log.info("Plan:");
  for (const item of plan) {
    if (item.notFound) {
      log.warn(`  ${item.slug.padEnd(28)} — NICHT in DB, übersprungen`);
      continue;
    }
    const leadHint = item.leadChange
      ? ` · lead: "${item.leadChange.from ?? "(null)"}" → "${item.leadChange.to}"`
      : "";
    log.info(`  ${item.slug.padEnd(28)} → ${item.blockCount} Blocks${leadHint}`);
  }

  if (!apply) {
    log.info("");
    log.info("Dry-Run beendet. Mit --apply tatsächlich UPDATEen.");
    return;
  }

  log.info("");
  log.info("LIVE: Updates werden ausgeführt…");
  let updated = 0;
  let failed = 0;
  for (const p of parsed) {
    if (!existingMap.has(p.slug)) {
      log.skip(`Skip ${p.slug} (nicht in DB)`);
      continue;
    }
    const blocks = markdownToBlocks(p.body);
    const doc = {
      version: BLOCK_SCHEMA_VERSION,
      blocks,
      sources: [],
    };
    const patch: Record<string, unknown> = { body_blocks: doc };
    if (p.lead !== undefined) patch.lead = p.lead;
    const { error } = await supabase
      .from("pages")
      .update(patch)
      .eq("slug", p.slug);
    if (error) {
      log.fail(`Update "${p.slug}" fehlgeschlagen: ${error.message}`);
      failed++;
    } else {
      log.ok(`Updated "${p.slug}" (${blocks.length} Blocks)`);
      updated++;
    }
  }

  log.info("");
  log.info(`Updated: ${updated}, Failed: ${failed}`);
  if (failed > 0) process.exit(3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
