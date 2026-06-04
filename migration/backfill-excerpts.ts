// Excerpt-Backfill — voll-automatische AI-Generierung der fehlenden
// Abstracts fuer Bestands-published-Artikel. Einmaliges Batch.
//
// Ausfuehrung:
//   npx tsx migration/backfill-excerpts.ts                 (dry-run, default)
//   npx tsx migration/backfill-excerpts.ts --apply         (echter DB-Write)
//
// Voraussetzungen:
//   - SUPABASE_URL (oder NEXT_PUBLIC_SUPABASE_URL)
//   - SUPABASE_SERVICE_ROLE_KEY (NIEMALS committen)
//   - ANTHROPIC_API_KEY
//   - Migration 20260604141641_system_batch_author.sql gepusht (legt die
//     authors-Row 'System Batch' an, auf die ai_usage_log-Eintraege
//     attribuiert werden — ai_usage_log.author_id ist NOT NULL FK).
//
// Modell ist hartverdrahtet auf claude-sonnet-4-6 — explizit fuer diesen
// Lauf gewuenscht, unabhaengig vom ai_config-Default (Haiku) den der
// interaktive Editor-Button nutzt.
//
// Guard: jeder UPDATE traegt WHERE excerpt IS NULL OR excerpt = '' — ein
// bereits vorhandener Abstract wird unter keinen Umstaenden ueberschrieben.
//
// Log-Datei (NICHT committen, gitignored): migration/excerpt-backfill-log.json
//   - Enthaelt pro Artikel: id, slug, title, generated abstract, usage.
//   - Wird in dry-run UND apply-Mode geschrieben; bei apply zusaetzlich
//     pro Eintrag das DB-Write-Resultat (success/skipped/error).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "node:fs";
import { renderBlockDocumentToMarkdown } from "../src/lib/blockDocumentMarkdown";
import { stripAllMarkup } from "../src/lib/tiptap/roundtripGuard";
import {
  buildAbstractPrompt,
  buildAbstractSystem,
  cleanAbstractText,
} from "../src/lib/ai/abstractPrompts";
import type { Database, Json } from "../src/lib/database.types";
import type { BlockDocument } from "../src/types/blocks";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 300;
const SLEEP_BETWEEN_CALLS_MS = 1500;
const SYSTEM_BATCH_AUTHOR_SLUG = "system-batch";
const LOG_PATH = "migration/excerpt-backfill-log.json";
const PROVIDER_NAME = "anthropic";
const AI_TASK = "abstract_generate";

type Article = {
  id: string;
  slug: string;
  title: string;
  body_blocks: Json | null;
  body_md: string | null;
  locale: string | null;
  seo_keyword_primary: string | null;
};

type LogEntry = {
  id: string;
  slug: string;
  title: string;
  status: "generated" | "written" | "skipped_no_body" | "skipped_already_set" | "error";
  abstract?: string;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
};

function parseArgs(): { apply: boolean; limit: number | null } {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.slice("--limit=".length), 10) : null;
  if (limit !== null && (!Number.isFinite(limit) || limit <= 0)) {
    process.stderr.write("Invalid --limit value\n");
    process.exit(1);
  }
  return { apply, limit };
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

async function fetchSystemBatchAuthorId(supabase: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await supabase
    .from("authors")
    .select("id")
    .eq("slug", SYSTEM_BATCH_AUTHOR_SLUG)
    .maybeSingle();
  if (error) {
    process.stderr.write(`Failed to load system-batch author: ${error.message}\n`);
    process.exit(1);
  }
  if (!data) {
    process.stderr.write(
      "System-batch author row missing. Run `npx supabase db push` to apply migration 20260604141641_system_batch_author.sql first.\n",
    );
    process.exit(1);
  }
  return data.id;
}

async function fetchTargetArticles(
  supabase: SupabaseClient<Database>,
  limit: number | null,
): Promise<Article[]> {
  // RLS-bypass via Service-Role. Nur published-Artikel mit leerem/null
  // excerpt — Author-CRUD-Drafts und Archived bleiben unangetastet.
  let query = supabase
    .from("articles")
    .select("id, slug, title, body_blocks, body_md, locale, seo_keyword_primary")
    .eq("status", "published")
    .or("excerpt.is.null,excerpt.eq.")
    .order("slug", { ascending: true });
  if (limit !== null) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    process.stderr.write(`Failed to load articles: ${error.message}\n`);
    process.exit(1);
  }
  return (data ?? []) as Article[];
}

function getBodyText(article: Article): string {
  const bb = article.body_blocks as unknown as BlockDocument | null;
  if (bb && Array.isArray(bb.blocks) && bb.blocks.length > 0) {
    const md = renderBlockDocumentToMarkdown(bb);
    return stripAllMarkup(md).trim();
  }
  // Fallback fuer Legacy-Artikel ohne body_blocks.
  return stripAllMarkup(article.body_md ?? "").trim();
}

function resolveLocale(raw: string | null): "de-CH" | "en" {
  return raw === "en" ? "en" : "de-CH";
}

async function callAnthropic(
  client: Anthropic,
  args: { title: string; bodyText: string; locale: "de-CH" | "en"; focusKeyword: string | null },
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildAbstractSystem(args.locale, args.focusKeyword),
    messages: [{ role: "user", content: buildAbstractPrompt(args) }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return {
    text: cleanAbstractText(text),
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
  };
}

async function logUsage(
  supabase: SupabaseClient<Database>,
  authorId: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const { error } = await supabase.from("ai_usage_log").insert({
    author_id: authorId,
    task: AI_TASK,
    provider: PROVIDER_NAME,
    model: MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  });
  if (error) {
    // Logging-Failure soll den Lauf nicht killen, aber sichtbar machen.
    process.stderr.write(`[usage-log] ${error.message}\n`);
  }
}

async function writeExcerpt(
  supabase: SupabaseClient<Database>,
  id: string,
  excerpt: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  // Doppel-Guard auf DB-Ebene: WHERE excerpt IS NULL OR excerpt = ''. Selbst
  // bei Race-Condition (jemand pflegt waehrend des Laufs einen Abstract)
  // ueberschreibt das Skript nichts.
  const { data, error } = await supabase
    .from("articles")
    .update({ excerpt })
    .eq("id", id)
    .or("excerpt.is.null,excerpt.eq.")
    .select("id");
  if (error) return { ok: false, reason: error.message };
  if (!data || data.length === 0) {
    return { ok: false, reason: "no row updated (excerpt already set between fetch and update)" };
  }
  return { ok: true };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const { apply, limit } = parseArgs();
  const supabase = getSupabaseClient();
  const anthropic = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });

  process.stdout.write(`Mode:  ${apply ? "APPLY (real DB writes)" : "DRY-RUN (no DB writes)"}\n`);
  process.stdout.write(`Model: ${MODEL}\n`);
  if (limit !== null) process.stdout.write(`Limit: ${limit} articles\n`);

  const systemAuthorId = await fetchSystemBatchAuthorId(supabase);
  process.stdout.write(`System-batch author: ${systemAuthorId}\n`);

  const articles = await fetchTargetArticles(supabase, limit);
  process.stdout.write(`Target articles: ${articles.length}\n\n`);

  const log: LogEntry[] = [];
  let generated = 0;
  let written = 0;
  let skipped = 0;
  let errored = 0;
  let totalInTokens = 0;
  let totalOutTokens = 0;

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const prefix = `[${i + 1}/${articles.length}] ${a.slug}`;
    const bodyText = getBodyText(a);
    if (!bodyText) {
      process.stdout.write(`${prefix}: SKIP — no body content\n`);
      log.push({ id: a.id, slug: a.slug, title: a.title, status: "skipped_no_body" });
      skipped++;
      continue;
    }
    const locale = resolveLocale(a.locale);
    const keyword = a.seo_keyword_primary?.trim() || null;

    try {
      const result = await callAnthropic(anthropic, {
        title: a.title,
        bodyText,
        locale,
        focusKeyword: keyword,
      });
      generated++;
      totalInTokens += result.inputTokens;
      totalOutTokens += result.outputTokens;

      // Usage-Log in beiden Modi (auch dry-run) — der API-Call ist passiert
      // und die Kosten fielen an, also gehoeren sie ins Hauptbuch.
      await logUsage(supabase, systemAuthorId, result.inputTokens, result.outputTokens);

      const entry: LogEntry = {
        id: a.id,
        slug: a.slug,
        title: a.title,
        status: apply ? "generated" : "generated",
        abstract: result.text,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };

      if (apply) {
        const write = await writeExcerpt(supabase, a.id, result.text);
        if (write.ok) {
          entry.status = "written";
          written++;
          process.stdout.write(
            `${prefix}: OK — ${result.inputTokens}/${result.outputTokens} tokens, written\n`,
          );
        } else {
          entry.status = "skipped_already_set";
          entry.error = write.reason;
          skipped++;
          process.stdout.write(
            `${prefix}: SKIP — ${result.inputTokens}/${result.outputTokens} tokens, ${write.reason}\n`,
          );
        }
      } else {
        process.stdout.write(
          `${prefix}: OK (dry-run) — ${result.inputTokens}/${result.outputTokens} tokens\n`,
        );
      }
      log.push(entry);
    } catch (err) {
      errored++;
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${prefix}: ERROR — ${msg}\n`);
      log.push({ id: a.id, slug: a.slug, title: a.title, status: "error", error: msg });
    }

    if (i < articles.length - 1) await sleep(SLEEP_BETWEEN_CALLS_MS);
  }

  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf-8");

  process.stdout.write("\n=== Summary ===\n");
  process.stdout.write(`Articles processed: ${articles.length}\n`);
  process.stdout.write(`Generated:          ${generated}\n`);
  if (apply) process.stdout.write(`Written to DB:      ${written}\n`);
  process.stdout.write(`Skipped:            ${skipped}\n`);
  process.stdout.write(`Errored:            ${errored}\n`);
  process.stdout.write(`Tokens (in/out):    ${totalInTokens} / ${totalOutTokens}\n`);
  process.stdout.write(`Log written to:     ${LOG_PATH}\n`);
  if (!apply) {
    process.stdout.write("\nDRY-RUN — no DB writes performed. Re-run with --apply to commit.\n");
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
