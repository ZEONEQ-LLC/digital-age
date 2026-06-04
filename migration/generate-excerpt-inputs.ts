// Generiert das Briefing-Markdown fuer den manuellen Excerpt-Backfill
// ueber Claude.ai. Laedt alle published Artikel mit leerem/null excerpt
// aus der Cloud-DB und schreibt sie in migration/excerpt-inputs.md
// (gitignored).
//
// Ausfuehrung:
//   export SUPABASE_URL="https://<ref>.supabase.co"   # oder NEXT_PUBLIC_SUPABASE_URL
//   export SUPABASE_SERVICE_ROLE_KEY=...
//   npx tsx migration/generate-excerpt-inputs.ts
//
// Outputs:
//   migration/excerpt-inputs.md   — Markdown fuer Claude.ai
//
// Body wird via renderBlockDocumentToMarkdown + stripAllMarkup zu
// Plaintext aggregiert, dann auf MAX_BODY_CHARS (4000) gecappt — gleicher
// Mechanismus wie der Editor-Button + das API-Backfill-Skript, damit der
// resultierende Abstract konsistent zur UI-Generierung ist.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { renderBlockDocumentToMarkdown } from "../src/lib/blockDocumentMarkdown";
import { stripAllMarkup } from "../src/lib/tiptap/roundtripGuard";
import { MAX_BODY_CHARS } from "../src/lib/ai/abstractPrompts";
import type { Database, Json } from "../src/lib/database.types";
import type { BlockDocument } from "../src/types/blocks";

const OUT_PATH = "migration/excerpt-inputs.md";

type Article = {
  id: string;
  slug: string;
  title: string;
  body_blocks: Json | null;
  body_md: string | null;
  locale: string | null;
  seo_keyword_primary: string | null;
};

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

async function fetchTargets(supabase: SupabaseClient<Database>): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, body_blocks, body_md, locale, seo_keyword_primary")
    .eq("status", "published")
    .or("excerpt.is.null,excerpt.eq.")
    .order("slug", { ascending: true });
  if (error) {
    process.stderr.write(`Failed to load articles: ${error.message}\n`);
    process.exit(1);
  }
  return (data ?? []) as Article[];
}

function getBodyText(article: Article): string {
  const bb = article.body_blocks as unknown as BlockDocument | null;
  if (bb && Array.isArray(bb.blocks) && bb.blocks.length > 0) {
    return stripAllMarkup(renderBlockDocumentToMarkdown(bb)).trim();
  }
  return stripAllMarkup(article.body_md ?? "").trim();
}

function resolveLocale(raw: string | null): "de-CH" | "en" {
  return raw === "en" ? "en" : "de-CH";
}

function formatArticleBlock(idx: number, total: number, a: Article): string {
  const bodyText = getBodyText(a).slice(0, MAX_BODY_CHARS);
  const locale = resolveLocale(a.locale);
  const keyword = a.seo_keyword_primary?.trim() || "(none)";
  return [
    `## Artikel ${idx + 1} von ${total}`,
    "",
    `- **ID:** \`${a.id}\``,
    `- **Slug:** \`${a.slug}\``,
    `- **Titel:** ${a.title}`,
    `- **Locale:** ${locale}`,
    `- **Focus-Keyword:** ${keyword}`,
    "",
    "**Body-Text (zur Zusammenfassung):**",
    "",
    bodyText,
    "",
    "---",
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const supabase = getSupabaseClient();
  const articles = await fetchTargets(supabase);
  process.stdout.write(`Loaded ${articles.length} target articles.\n`);

  const header = [
    "# Excerpt-Backfill — Eingabe-Briefing",
    "",
    `Generiert: ${new Date().toISOString()}`,
    `Artikel mit leerem/null excerpt: **${articles.length}**`,
    "",
    "Diese Datei enthaelt die Roh-Daten der zu zusammenfassenden Artikel.",
    "Anleitung + Prompt fuer Claude.ai stehen in `migration/excerpt-prompt.md`.",
    "",
    "---",
    "",
  ].join("\n");

  const body = articles.map((a, i) => formatArticleBlock(i, articles.length, a)).join("");

  writeFileSync(OUT_PATH, header + body, "utf-8");
  process.stdout.write(`Wrote: ${OUT_PATH}\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
