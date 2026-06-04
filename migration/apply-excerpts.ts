// Apply-Skript fuer den manuellen Excerpt-Backfill via Claude.ai.
// Liest migration/excerpt-outputs.json (Array {id, excerpt}) und schreibt
// in articles.excerpt mit Guard "WHERE excerpt IS NULL OR excerpt = ''".
//
// Ausfuehrung:
//   export SUPABASE_URL="https://<ref>.supabase.co"
//   export SUPABASE_SERVICE_ROLE_KEY=...
//   npx tsx migration/apply-excerpts.ts                # dry-run, default
//   npx tsx migration/apply-excerpts.ts --apply        # echter DB-Write
//
// Sicherheitsnetze:
//   - dry-run default
//   - DB-Guard pro UPDATE schuetzt vor Race mit manuellen Edits
//   - pro Eintrag: id-Format-Check (UUID), excerpt nicht leer
//   - Duplikate (gleiche id mehrfach im Array) werden konsolidiert
//     (letzter Eintrag gewinnt, Warning ins Log)
//   - kein Re-Write: Artikel mit existierendem excerpt werden vom DB-Guard
//     uebersprungen, das Skript meldet das als "skipped_already_set"

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import type { Database } from "../src/lib/database.types";

const INPUT_PATH = "migration/excerpt-outputs.json";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OutputEntry = { id: string; excerpt: string };

function parseArgs(): { apply: boolean } {
  return { apply: process.argv.slice(2).includes("--apply") };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    process.stderr.write(`Missing env: ${name}\n`);
    process.exit(1);
  }
  return v;
}

function getSupabaseClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    process.stderr.write("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL\n");
    process.exit(1);
  }
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

function loadOutputs(): OutputEntry[] {
  let raw: string;
  try {
    raw = readFileSync(INPUT_PATH, "utf-8");
  } catch (err) {
    process.stderr.write(`Cannot read ${INPUT_PATH}: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`${INPUT_PATH} is not valid JSON: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
  if (!Array.isArray(parsed)) {
    process.stderr.write(`${INPUT_PATH} must be a JSON array.\n`);
    process.exit(1);
  }
  const out: OutputEntry[] = [];
  for (const [idx, item] of parsed.entries()) {
    if (
      item === null ||
      typeof item !== "object" ||
      typeof (item as { id?: unknown }).id !== "string" ||
      typeof (item as { excerpt?: unknown }).excerpt !== "string"
    ) {
      process.stderr.write(`Entry #${idx} missing {id, excerpt} string fields.\n`);
      process.exit(1);
    }
    out.push({ id: (item as { id: string }).id, excerpt: (item as { excerpt: string }).excerpt });
  }
  return out;
}

function consolidate(entries: OutputEntry[]): { entries: OutputEntry[]; warnings: string[] } {
  const seen = new Map<string, OutputEntry>();
  const warnings: string[] = [];
  for (const e of entries) {
    if (!UUID_RE.test(e.id)) {
      warnings.push(`invalid UUID, skipped: ${e.id}`);
      continue;
    }
    const trimmed = e.excerpt.trim();
    if (trimmed === "") {
      warnings.push(`empty excerpt, skipped: ${e.id}`);
      continue;
    }
    if (seen.has(e.id)) {
      warnings.push(`duplicate id, last wins: ${e.id}`);
    }
    seen.set(e.id, { id: e.id, excerpt: trimmed });
  }
  return { entries: Array.from(seen.values()), warnings };
}

async function writeOne(
  supabase: SupabaseClient<Database>,
  entry: OutputEntry,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data, error } = await supabase
    .from("articles")
    .update({ excerpt: entry.excerpt })
    .eq("id", entry.id)
    .or("excerpt.is.null,excerpt.eq.")
    .select("id");
  if (error) return { ok: false, reason: error.message };
  if (!data || data.length === 0) {
    return { ok: false, reason: "no row updated (id unknown OR excerpt already set)" };
  }
  return { ok: true };
}

async function main(): Promise<void> {
  const { apply } = parseArgs();
  const supabase = getSupabaseClient();

  process.stdout.write(`Mode:  ${apply ? "APPLY (real DB writes)" : "DRY-RUN (no DB writes)"}\n`);
  process.stdout.write(`Input: ${INPUT_PATH}\n`);

  const raw = loadOutputs();
  const { entries, warnings } = consolidate(raw);
  process.stdout.write(`Parsed: ${raw.length} entries → ${entries.length} after validation\n`);
  for (const w of warnings) process.stderr.write(`  warning: ${w}\n`);
  process.stdout.write("\n");

  let written = 0;
  let skipped = 0;
  let errored = 0;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const prefix = `[${i + 1}/${entries.length}] ${e.id}`;
    if (!apply) {
      process.stdout.write(`${prefix}: DRY — would write ${e.excerpt.length} chars\n`);
      continue;
    }
    try {
      const res = await writeOne(supabase, e);
      if (res.ok) {
        written++;
        process.stdout.write(`${prefix}: OK\n`);
      } else {
        skipped++;
        process.stdout.write(`${prefix}: SKIP — ${res.reason}\n`);
      }
    } catch (err) {
      errored++;
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${prefix}: ERROR — ${msg}\n`);
    }
  }

  process.stdout.write("\n=== Summary ===\n");
  process.stdout.write(`Entries validated: ${entries.length}\n`);
  if (apply) {
    process.stdout.write(`Written:           ${written}\n`);
    process.stdout.write(`Skipped:           ${skipped}\n`);
    process.stdout.write(`Errored:           ${errored}\n`);
  } else {
    process.stdout.write("\nDRY-RUN — no DB writes performed. Re-run with --apply to commit.\n");
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
