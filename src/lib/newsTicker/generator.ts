import "server-only";

import { callLLMForAuthor } from "@/lib/ai/systemCall";
import type { Database } from "@/lib/database.types";
import type { RawFeedItem } from "./fetcher";
import { describeLlmError, parseGenerated, type GenerateOutcome } from "./parse";

export type { GeneratedItem, GenerateOutcome } from "./parse";

type NewsSourceRow = Database["public"]["Tables"]["news_sources"]["Row"];

const MAX_DESCRIPTION_CHARS = 1500;

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

/**
 * Generiert ein Ticker-Item aus einem RSS-Item via LLM. Laeuft ueber
 * callLLMForAuthor, weil der Cron keine Browser-Session hat (callLLM braucht
 * eine; daran ist der Cron bis PR 191 bei jedem Item gescheitert). Kosten
 * traegt `authorId` (Editor, der den Refresh ausloest, bzw. der System-Author
 * beim Cron).
 */
export async function generateNewsItem(
  rawItem: RawFeedItem,
  source: NewsSourceRow,
  promptTemplate: string,
  authorId: string,
): Promise<GenerateOutcome> {
  const result = await callLLMForAuthor(authorId, {
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
    return { kind: "error", message: describeLlmError(result.kind, result.message) };
  }

  return parseGenerated(result.text);
}
