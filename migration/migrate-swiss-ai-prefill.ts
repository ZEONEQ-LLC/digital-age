// Swiss-AI-Startups → Supabase ai_startups Migration.
//
// Liest migration/swiss_ai_startups.json und INSERTet alle Einträge als
// status='published'. Featured-Flag aus dem JSON wird IGNORIERT, weil die
// DB max 3 featured Rows erlaubt (Spotlight-Trigger) — Editor wählt nach
// dem Migrate manuell 3 via /autor/admin/startups aus.
//
// Idempotent über slug: zweiter Lauf überspringt existierende Rows.
//
// Ausführung:
//   npx tsx migration/migrate-swiss-ai-prefill.ts            # Dry-Run
//   npx tsx migration/migrate-swiss-ai-prefill.ts --apply    # Live
//
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (per Shell, nicht committed).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createLogger } from "./lib/logger";

const JSON_PATH = "migration/swiss_ai_startups.json";
const LOG_PATH = `migration/logs/migrate-swiss-ai-${new Date()
  .toISOString()
  .replace(/[:.]/g, "-")}.log`;

type SwissStatus = "swiss_based" | "swiss_founded" | "active_in_ch";
type EmployeeRange = "r_1_10" | "r_11_50" | "r_51_200" | "r_201_500" | "r_500_plus";
type FundingStage =
  | "bootstrapped"
  | "pre_seed"
  | "seed"
  | "series_a"
  | "series_b_plus"
  | "public_company";

type JsonEntry = {
  name: string;
  tagline: string;
  description: string;
  website: string;
  logo_url: string | null;
  swiss_status: SwissStatus;
  industry: string;
  city: string;
  employee_range: EmployeeRange;
  founded_year: number;
  funding_stage?: FundingStage | null;
  total_funding_range?: string | null;
  last_round_at?: string | null;
  open_to_investment?: boolean;
  pitch_deck_url?: string | null;
  founder_names?: string[];
  featured?: boolean; // ignoriert (DB max 3)
};

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Env-Var ${key} fehlt.`);
  return v;
}

function args() {
  return { apply: process.argv.slice(2).includes("--apply") };
}

// Slug-Generator: gleiche Logik wie suggest_startup_slug (Initial-Schema).
// Lowercase, Umlaute-Translit, Sonderzeichen → Bindestriche.
function slugify(name: string): string {
  return name
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

async function main() {
  const log = createLogger(LOG_PATH);
  const { apply } = args();
  log.info(apply ? "Modus: LIVE (--apply)" : "Modus: DRY-RUN");

  const supabaseUrl = env("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const raw = readFileSync(JSON_PATH, "utf-8");
  const entries: JsonEntry[] = JSON.parse(raw);
  log.info(`JSON: ${entries.length} Einträge`);

  // Slug-Generation + Dedup-Check in JSON selbst
  const seenSlugs = new Map<string, number>();
  const prepared = entries.map((e, idx) => {
    const slug = slugify(e.name);
    if (seenSlugs.has(slug)) {
      log.warn(`Slug-Konflikt INNERHALB JSON: "${slug}" tritt ${idx + 1}× auf`);
    }
    seenSlugs.set(slug, (seenSlugs.get(slug) ?? 0) + 1);
    return { ...e, slug };
  });

  // Existierende Slugs aus DB holen
  const { data: existing, error: existingErr } = await supabase
    .from("ai_startups")
    .select("slug");
  if (existingErr) {
    log.fail(`Existing-Slug-Read fehlgeschlagen: ${existingErr.message}`);
    process.exit(2);
  }
  const existingSlugs = new Set((existing ?? []).map((r) => r.slug));
  log.info(`DB: ${existingSlugs.size} bestehende Slugs`);

  // Plan
  const toInsert: typeof prepared = [];
  const skipped: string[] = [];
  for (const e of prepared) {
    if (existingSlugs.has(e.slug)) {
      skipped.push(e.slug);
    } else {
      toInsert.push(e);
    }
  }
  log.info(``);
  log.info(`Geplante Inserts: ${toInsert.length}`);
  log.info(`Übersprungen (Slug existiert):  ${skipped.length}`);
  for (const s of skipped) log.skip(`  ${s}`);

  log.info(``);
  log.info(`Erste 5 geplante Inserts:`);
  for (const e of toInsert.slice(0, 5)) {
    log.info(`  ${e.slug.padEnd(40)}  ${e.name}`);
  }
  if (toInsert.length > 5) log.info(`  … und ${toInsert.length - 5} weitere`);

  if (!apply) {
    log.info("");
    log.info("Dry-Run beendet. Mit --apply tatsächlich INSERTen.");
    return;
  }

  log.info("");
  log.info(`LIVE: ${toInsert.length} Inserts werden ausgeführt…`);

  let inserted = 0;
  let failed = 0;
  for (const e of toInsert) {
    const insert = {
      slug: e.slug,
      name: e.name,
      tagline: e.tagline,
      description: e.description,
      website: e.website,
      logo_url: e.logo_url ?? null,
      swiss_status: e.swiss_status,
      industry: e.industry,
      city: e.city,
      employee_range: e.employee_range,
      founded_year: e.founded_year,
      funding_stage: e.funding_stage ?? null,
      total_funding_range: e.total_funding_range ?? null,
      last_round_at: e.last_round_at ?? null,
      open_to_investment: e.open_to_investment ?? false,
      pitch_deck_url: e.pitch_deck_url ?? null,
      founder_names:
        Array.isArray(e.founder_names) && e.founder_names.length > 0
          ? e.founder_names
          : null,
      // Featured-Flag aus JSON IGNORIERT (siehe Header-Kommentar).
      status: "published" as const,
      published_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("ai_startups").insert(insert);
    if (error) {
      log.fail(`Insert "${e.slug}" fehlgeschlagen: ${error.message}`);
      failed++;
    } else {
      log.ok(`Inserted "${e.slug}"`);
      inserted++;
    }
  }

  log.info("");
  log.info(`Inserted: ${inserted}, Failed: ${failed}`);
  if (failed > 0) process.exit(3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
