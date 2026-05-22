import "server-only";

import { callLLM } from "@/lib/ai/client";
import type { Database } from "@/lib/database.types";
import type { RawFeedItem } from "./fetcher";

type NewsSourceRow = Database["public"]["Tables"]["news_sources"]["Row"];

export type GeneratedItem = {
  title: string;
  teaser: string;
  summary: string;
  category: string | null;
};

const MAX_DESCRIPTION_CHARS = 1500;
const RAW_LOG_MAX = 2000;

function truncateForLog(s: string): string {
  return s.length > RAW_LOG_MAX ? `${s.slice(0, RAW_LOG_MAX)}…[truncated]` : s;
}

function stripCodeFence(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("```")) return t;
  return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

// Inhalte aus dem RSS-<description>-Feld sind oft HTML. Wir reissen Tags
// raus + decoden ein paar häufige Entities. Für den LLM reicht das — er
// muss den Sinn extrahieren, nicht das exakte Markup.
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSystem(promptTemplate: string, source: NewsSourceRow): string {
  // Kontext-Block prefixed; der Editor-pflegbare Template-Teil folgt
  // unverändert. Damit kennt der LLM die Original-Sprache (für Übersetzung)
  // und die Default-Kategorie als Fallback.
  const ctx = [
    `KONTEXT: Original-Sprache des Feeds: ${source.language}.`,
    source.default_category
      ? `Default-Kategorie wenn unsicher: ${source.default_category}.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
  return `${ctx}\n\n${promptTemplate}`;
}

function buildUserPrompt(rawItem: RawFeedItem): string {
  const desc = stripHtml(rawItem.description).slice(0, MAX_DESCRIPTION_CHARS);
  return [
    `Original-Titel: ${rawItem.original_title.trim()}`,
    "",
    `Original-Beschreibung: ${desc || "(leer)"}`,
    "",
    `Quelle-URL: ${rawItem.source_url}`,
  ].join("\n");
}

// Schema-Validierung: Skip- oder Voll-Item. Bei jeder Drift → null + Log.
function parseGenerated(raw: string): GeneratedItem | null {
  const text = stripCodeFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error(
      "[news-generator] JSON.parse failed:",
      err instanceof Error ? err.message : String(err),
      "| raw:",
      truncateForLog(raw),
    );
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    console.error(
      "[news-generator] Schema validation failed: top-level not an object | raw:",
      truncateForLog(raw),
    );
    return null;
  }
  const p = parsed as Record<string, unknown>;

  // Skip-Signal hat absoluten Vorrang. {"skip": true} → null ohne Error-Log.
  if (p.skip === true) return null;

  const title = typeof p.title === "string" ? p.title.trim() : null;
  const teaser = typeof p.teaser === "string" ? p.teaser.trim() : null;
  const summary = typeof p.summary === "string" ? p.summary.trim() : null;
  const categoryRaw = p.category;
  const category =
    typeof categoryRaw === "string" && categoryRaw.trim() !== ""
      ? categoryRaw.trim()
      : null;

  if (!title || !teaser || !summary) {
    console.error(
      "[news-generator] Schema validation failed:",
      JSON.stringify({
        title: typeof p.title,
        teaser: typeof p.teaser,
        summary: typeof p.summary,
        category: typeof p.category,
      }),
      "| raw:",
      truncateForLog(raw),
    );
    return null;
  }

  return { title, teaser, summary, category };
}

/**
 * Generiert ein Ticker-Item aus einem RSS-Item via LLM. Bei skip (off-topic)
 * oder Schema-Drift: null. Provider-Fehler werden ebenfalls als null +
 * console.error zurückgegeben (Caller zählt items_skipped_generation).
 */
export async function generateNewsItem(
  rawItem: RawFeedItem,
  source: NewsSourceRow,
  promptTemplate: string,
): Promise<GeneratedItem | null> {
  const result = await callLLM({
    system: buildSystem(promptTemplate, source),
    prompt: buildUserPrompt(rawItem),
    maxTokens: 400,
    task: "news_item_generation",
  });

  if (!result.ok) {
    console.error(
      `[news-generator] LLM-Call failed for ${rawItem.source_url}:`,
      result.kind,
      result.message,
    );
    return null;
  }

  return parseGenerated(result.text);
}
