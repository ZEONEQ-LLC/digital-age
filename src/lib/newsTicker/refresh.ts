import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { fetchAndParseFeed } from "./fetcher";
import { generateNewsItem } from "./generator";
import type { Database } from "@/lib/database.types";

type NewsSourceRow = Database["public"]["Tables"]["news_sources"]["Row"];

export type RefreshError = {
  source_id: string;
  source_name: string;
  message: string;
};

export type RefreshStats = {
  sources_polled: number;
  items_fetched: number;
  items_generated: number;
  items_skipped_dedup: number;
  items_skipped_generation: number;
  errors: RefreshError[];
  // Wenn true, wurde der Run wegen `news_ticker_config.is_paused = true`
  // sofort abgebrochen — alle Zähler bleiben 0.
  paused?: boolean;
};

const PROMPT_FALLBACK =
  "Du analysierst RSS-Items für ein KI-Magazin. Gib JSON {title, teaser, summary, category} oder {skip: true} zurück.";

/**
 * Sequenzieller Refresh-Lauf:
 *   1. Aktive Quellen laden
 *   2. Pro Quelle: Feed fetchen, Items dedup-prüfen, neue Items via LLM
 *      generieren, in news_items inserten
 *   3. Config-Singleton mit last_refresh_at + Stats updaten
 *
 * Verwendet Service-Role, damit die gleiche Funktion vom Admin-UI (Editor-
 * Session) UND vom Cron-Endpoint (keine Session) gleich gerufen werden kann.
 * Caller-Gating (Editor-Check / Env-Flag-Check) passiert OBEN, nicht hier.
 */
export async function runRefresh(): Promise<RefreshStats> {
  const supabase = createServiceClient();
  const stats: RefreshStats = {
    sources_polled: 0,
    items_fetched: 0,
    items_generated: 0,
    items_skipped_dedup: 0,
    items_skipped_generation: 0,
    errors: [],
  };

  // Config-Singleton zuerst laden — Pause-Check kommt vor allen Reads.
  const { data: cfg } = await supabase
    .from("news_ticker_config")
    .select("generation_prompt, is_paused, items_per_source")
    .eq("id", 1)
    .maybeSingle();

  if (cfg?.is_paused) {
    // Stats bleiben auf 0, paused-Flag setzen. Wir schreiben trotzdem
    // last_refresh_at + last_refresh_stats zurück, damit der Editor sieht,
    // dass ein Trigger durchgelaufen ist.
    stats.paused = true;
    await supabase
      .from("news_ticker_config")
      .update({
        last_refresh_at: new Date().toISOString(),
        last_refresh_stats: stats as unknown as Database["public"]["Tables"]["news_ticker_config"]["Update"]["last_refresh_stats"],
      })
      .eq("id", 1);
    return stats;
  }

  const promptTemplate = cfg?.generation_prompt?.trim() || PROMPT_FALLBACK;
  const itemsPerSource = cfg?.items_per_source ?? 10;

  // Aktive Quellen laden, sortiert nach name (deterministische Reihenfolge
  // im Log).
  const { data: sources, error: sourcesErr } = await supabase
    .from("news_sources")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (sourcesErr) {
    throw new Error(`Quellen-Read fehlgeschlagen: ${sourcesErr.message}`);
  }

  for (const source of sources ?? []) {
    await processSource(supabase, source, promptTemplate, itemsPerSource, stats);
  }

  // Stats zurückschreiben — even bei 0 sources, damit der Editor sieht dass
  // der Refresh lief.
  await supabase
    .from("news_ticker_config")
    .update({
      last_refresh_at: new Date().toISOString(),
      last_refresh_stats: stats as unknown as Database["public"]["Tables"]["news_ticker_config"]["Update"]["last_refresh_stats"],
    })
    .eq("id", 1);

  return stats;
}

async function processSource(
  supabase: ReturnType<typeof createServiceClient>,
  source: NewsSourceRow,
  promptTemplate: string,
  itemsPerSource: number,
  stats: RefreshStats,
): Promise<void> {
  stats.sources_polled += 1;

  let items;
  try {
    items = await fetchAndParseFeed(source, itemsPerSource);
  } catch (err) {
    stats.errors.push({
      source_id: source.id,
      source_name: source.name,
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  for (const item of items) {
    stats.items_fetched += 1;

    // Dedup über source_url (UNIQUE-Constraint deckt es zusätzlich ab,
    // aber wir wollen den LLM-Call sparen).
    const { data: existing } = await supabase
      .from("news_items")
      .select("id")
      .eq("source_url", item.source_url)
      .maybeSingle();

    if (existing) {
      stats.items_skipped_dedup += 1;
      continue;
    }

    let generated;
    try {
      generated = await generateNewsItem(item, source, promptTemplate);
    } catch (err) {
      stats.items_skipped_generation += 1;
      stats.errors.push({
        source_id: source.id,
        source_name: source.name,
        message: `Generator-Exception: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    if (!generated) {
      // skip oder Schema-Drift — generator hat bereits geloggt.
      stats.items_skipped_generation += 1;
      continue;
    }

    const category = generated.category ?? source.default_category ?? null;

    const { error: insErr } = await supabase.from("news_items").insert({
      source_id: source.id,
      source_url: item.source_url,
      original_title: item.original_title,
      title: generated.title,
      teaser: generated.teaser,
      summary: generated.summary,
      category,
      published_at: item.published_at.toISOString(),
      status: "approved",
      // Source-Name als Snapshot mitschreiben (denormalisiert, weil anon-
      // RLS auf news_sources den Embed im Public-Ticker blockt).
      source_name: source.name,
    });

    if (insErr) {
      // 23505 = unique violation: Race zwischen Dedup-Read und Insert
      // (zwei gleichzeitige Refreshs). Nicht fatal, ist Dedup-Hit.
      if (insErr.code === "23505") {
        stats.items_skipped_dedup += 1;
        continue;
      }
      stats.errors.push({
        source_id: source.id,
        source_name: source.name,
        message: `Insert-Fehler: ${insErr.message}`,
      });
      continue;
    }

    stats.items_generated += 1;
  }
}
