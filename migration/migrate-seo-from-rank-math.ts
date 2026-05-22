// Rank-Math-CSV → Supabase SEO-Backfill.
//
// Liest den Rank-Math-Export und überträgt seo_title / seo_description /
// focus_keyword auf die publizierten Artikel in Supabase. Strategie A
// (Always-Overwrite, vom User bestätigt): wenn die CSV einen non-empty
// Wert für ein Feld hat, überschreibt sie den Supabase-Wert. Wenn die CSV
// einen leeren Wert hat, bleibt der Supabase-Wert unverändert.
//
// Multi-Keyword-Mapping:
//   - CSV `focus_keyword` ist Kommaliste (Rank-Math-Konvention).
//   - Erstes Element → seo_keyword_primary
//   - Restliche Elemente → seo_keywords_secondary (text[])
//
// Ausführung:
//   npx tsx migration/migrate-seo-from-rank-math.ts            # Dry-Run (default)
//   npx tsx migration/migrate-seo-from-rank-math.ts --apply    # tatsächlich UPDATE
//
// Voraussetzungen:
//   - SUPABASE_URL (oder NEXT_PUBLIC_SUPABASE_URL) in der Env
//   - SUPABASE_SERVICE_ROLE_KEY in der Env
//
// Idempotent: zweiter Lauf produziert dieselben Updates (oder no-ops, wenn
// nichts mehr zu ändern ist).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createLogger } from "./lib/logger";

const CSV_PATH = "migration/digitalage_rank-math-2026-05-22_18-54-06.csv";
const LOG_PATH = `migration/logs/migrate-seo-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;

type ArticleRow = {
  id: string;
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keyword_primary: string | null;
  seo_keywords_secondary: string[];
};

type CsvRow = Record<string, string>;

type PlannedUpdate = {
  id: string;
  slug: string;
  changes: Partial<{
    seo_title: { from: string | null; to: string };
    seo_description: { from: string | null; to: string };
    seo_keyword_primary: { from: string | null; to: string };
    seo_keywords_secondary: { from: string[]; to: string[] };
  }>;
};

function args() {
  const argv = process.argv.slice(2);
  return { apply: argv.includes("--apply") };
}

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (!v) {
    throw new Error(`Env-Var ${key} fehlt — siehe Header-Kommentar.`);
  }
  return v;
}

// Minimal-CSV-Parser. RFC-4180-Subset: quoted fields, escaped quotes (""),
// newlines innerhalb von quoted fields, comma delimiter. Reicht für den
// Rank-Math-Export (Python-csv parst es problemlos, also Standard-CSV).
function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else if (c === "\r") {
        // CRLF: skip \r, \n triggert oben den row-finish
      } else {
        field += c;
      }
    }
  }
  // Trailing field/row
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }

  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj: CsvRow = {};
    header.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}

function splitKeywordList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
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

  // 1. CSV laden + Posts filtern
  const csvText = readFileSync(CSV_PATH, "utf-8");
  const allRows = parseCsv(csvText);
  const postRows = allRows.filter(
    (r) => r.object_type === "post" && r.slug && r.slug.length > 0,
  );
  log.info(`CSV: ${allRows.length} Rows total, ${postRows.length} Posts mit Slug`);

  const csvBySlug = new Map<string, CsvRow>();
  for (const r of postRows) {
    if (csvBySlug.has(r.slug)) {
      log.warn(`Doppelter Slug in CSV: ${r.slug}`);
    }
    csvBySlug.set(r.slug, r);
  }

  // 2. Supabase published Articles laden
  const { data: articles, error } = await supabase
    .from("articles")
    .select(
      "id, slug, seo_title, seo_description, seo_keyword_primary, seo_keywords_secondary",
    )
    .eq("status", "published");

  if (error) {
    log.fail(`Supabase-Read fehlgeschlagen: ${error.message}`);
    process.exit(2);
  }
  log.info(`Supabase: ${articles?.length ?? 0} published Articles`);

  // 3. Pro Article: Match + Planned-Update
  const planned: PlannedUpdate[] = [];
  const noMatch: string[] = [];
  const noChange: string[] = [];

  for (const a of (articles ?? []) as ArticleRow[]) {
    const csv = csvBySlug.get(a.slug);
    if (!csv) {
      noMatch.push(a.slug);
      continue;
    }

    const change: PlannedUpdate["changes"] = {};

    const csvTitle = csv.seo_title?.trim() ?? "";
    if (csvTitle.length > 0 && csvTitle !== (a.seo_title ?? "")) {
      change.seo_title = { from: a.seo_title, to: csvTitle };
    }

    const csvDesc = csv.seo_description?.trim() ?? "";
    if (csvDesc.length > 0 && csvDesc !== (a.seo_description ?? "")) {
      change.seo_description = { from: a.seo_description, to: csvDesc };
    }

    const csvKw = csv.focus_keyword?.trim() ?? "";
    if (csvKw.length > 0) {
      const tokens = splitKeywordList(csvKw);
      const newPrimary = tokens[0] ?? "";
      const newSecondary = tokens.slice(1);
      if (newPrimary && newPrimary !== (a.seo_keyword_primary ?? "")) {
        change.seo_keyword_primary = {
          from: a.seo_keyword_primary,
          to: newPrimary,
        };
      }
      if (!arraysEqual(newSecondary, a.seo_keywords_secondary ?? [])) {
        change.seo_keywords_secondary = {
          from: a.seo_keywords_secondary ?? [],
          to: newSecondary,
        };
      }
    }

    if (Object.keys(change).length === 0) {
      noChange.push(a.slug);
    } else {
      planned.push({ id: a.id, slug: a.slug, changes: change });
    }
  }

  // 4. Plan-Output
  log.info("");
  log.info(`Geplante Updates: ${planned.length}`);
  log.info(`Kein CSV-Match:   ${noMatch.length}`);
  log.info(`Bereits aktuell:  ${noChange.length}`);
  log.info("");

  for (const p of planned) {
    log.info(`── ${p.slug} (${p.id})`);
    for (const [field, change] of Object.entries(p.changes)) {
      if (!change) continue;
      const fromStr = Array.isArray(change.from)
        ? `[${change.from.join(", ")}]`
        : JSON.stringify(change.from);
      const toStr = Array.isArray(change.to)
        ? `[${change.to.join(", ")}]`
        : JSON.stringify(change.to);
      log.info(`   ${field}: ${truncate(fromStr, 60)} → ${truncate(toStr, 60)}`);
    }
  }

  if (noMatch.length > 0) {
    log.warn("");
    log.warn("Kein CSV-Match für folgende Supabase-Slugs:");
    for (const s of noMatch) log.warn(`  ${s}`);
  }

  // 5. Live-Apply
  if (!apply) {
    log.info("");
    log.info("Dry-Run beendet. Mit --apply tatsächlich UPDATEN.");
    return;
  }

  log.info("");
  log.info(`LIVE-MODUS: ${planned.length} Updates werden ausgeführt…`);

  let updated = 0;
  let failed = 0;
  for (const p of planned) {
    const update: Record<string, unknown> = {};
    for (const [field, change] of Object.entries(p.changes)) {
      if (!change) continue;
      update[field] = change.to;
    }
    const { error: updErr } = await supabase
      .from("articles")
      .update(update)
      .eq("id", p.id);
    if (updErr) {
      log.fail(`Update fehlgeschlagen für ${p.slug}: ${updErr.message}`);
      failed++;
    } else {
      updated++;
    }
  }

  log.info("");
  log.info(`Updated: ${updated}, Failed: ${failed}`);
  if (failed > 0) process.exit(3);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
