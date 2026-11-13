import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { resolveSystemAuthorId } from "@/lib/ai/systemAuthor";
import { fetchAndParseFeed } from "./fetcher";
import { assessExistingItem, generateNewsItem } from "./generator";
import type { Database } from "@/lib/database.types";
import { addRefreshError, emptyRefreshStats, type RefreshStats } from "./stats";

type NewsSourceRow = Database["public"]["Tables"]["news_sources"]["Row"];

export type { RefreshError, RefreshStats } from "./stats";

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
export async function runRefresh(opts: { authorId?: string } = {}): Promise<RefreshStats> {
  const supabase = createServiceClient();
  const stats: RefreshStats = emptyRefreshStats();

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

  // Wem die KI-Kosten zugeschrieben werden: dem Editor, der den Refresh im
  // Admin ausloest, beim Cron dem System-Author (NEWS_TICKER_AUTHOR_ID, sonst
  // aeltester Editor).
  const authorId =
    opts.authorId ?? (await resolveSystemAuthorId(supabase, "NEWS_TICKER_AUTHOR_ID"));
  if (!authorId) {
    throw new Error("Kein Editor gefunden, dem die KI-Kosten des Tickers zugeschrieben werden können.");
  }

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
    await processSource(supabase, source, promptTemplate, itemsPerSource, authorId, stats);
  }

  // Einordnung nachtragen (PR 199): aeltere Meldungen und solche, bei denen die
  // KI das Feld ausgelassen hat, pro Lauf hoechstens BACKFILL_PER_RUN.
  await backfillAssessments(supabase, authorId, stats);

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
  authorId: string,
  stats: RefreshStats,
): Promise<void> {
  stats.sources_polled += 1;

  let items;
  try {
    items = await fetchAndParseFeed(source, itemsPerSource);
  } catch (err) {
    addRefreshError(stats, source, err instanceof Error ? err.message : String(err));
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

    let outcome;
    try {
      outcome = await generateNewsItem(item, source, promptTemplate, authorId);
    } catch (err) {
      outcome = {
        kind: "error" as const,
        message: `Generator-Exception: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (outcome.kind === "skip") {
      stats.items_skipped_generation += 1;
      continue;
    }
    if (outcome.kind === "error") {
      stats.items_failed = (stats.items_failed ?? 0) + 1;
      addRefreshError(stats, source, outcome.message);
      continue;
    }
    const generated = outcome.item;

    const category = generated.category ?? source.default_category ?? null;

    const { error: insErr } = await supabase.from("news_items").insert({
      source_id: source.id,
      source_url: item.source_url,
      original_title: item.original_title,
      title: generated.title,
      teaser: generated.teaser,
      summary: generated.summary,
      category,
      // Feeds mit Zukunftsdatum (Netzwoche: Ausgabedatum) auf jetzt kappen.
      published_at: new Date(Math.min(item.published_at.getTime(), Date.now())).toISOString(),
      status: "approved",
      // Source-Name als Snapshot mitschreiben (denormalisiert, weil anon-
      // RLS auf news_sources den Embed im Public-Ticker blockt).
      source_name: source.name,
      assessment: generated.assessment as unknown as Database["public"]["Tables"]["news_items"]["Insert"]["assessment"],
      importance: generated.importance,
    });

    if (insErr) {
      // 23505 = unique violation: Race zwischen Dedup-Read und Insert
      // (zwei gleichzeitige Refreshs). Nicht fatal, ist Dedup-Hit.
      if (insErr.code === "23505") {
        stats.items_skipped_dedup += 1;
        continue;
      }
      stats.items_failed = (stats.items_failed ?? 0) + 1;
      addRefreshError(stats, source, `Insert-Fehler: ${insErr.message}`);
      continue;
    }

    stats.items_generated += 1;
  }
}

// Der Ticker laeuft einmal taeglich (scheduled_hour_cet) plus Klick im Admin;
// 60 pro Lauf holen den Bestand eines Monats in ein bis zwei Laeufen nach.
const BACKFILL_PER_RUN = 60;
const BACKFILL_PARALLEL = 5;
// Nur Meldungen, die noch auf /news stehen (Fenster dort: 30 Tage).
const BACKFILL_WINDOW_DAYS = 30;

async function backfillAssessments(
  supabase: ReturnType<typeof createServiceClient>,
  authorId: string,
  stats: RefreshStats,
): Promise<void> {
  const since = new Date(Date.now() - BACKFILL_WINDOW_DAYS * 86_400_000).toISOString();
  const { data: rows, error } = await supabase
    .from("news_items")
    .select("id, title, teaser, summary, source_name")
    .eq("status", "approved")
    // Ohne Einordnung, oder KI-Einordnung von vor PR 201 ohne Kehrseite.
    // Einordnungen der Redaktion bleiben unangetastet.
    .or("assessment.is.null,and(assessment->>kehrseite.is.null,assessment->>by.eq.ai)")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(BACKFILL_PER_RUN);
  if (error || !rows) return;
  // In kleinen Gruppen parallel, damit 60 Aufrufe nicht minutenlang dauern.
  for (let i = 0; i < rows.length; i += BACKFILL_PARALLEL) {
    await Promise.all(rows.slice(i, i + BACKFILL_PARALLEL).map(async (r) => {
      const res = await assessExistingItem({ title: r.title, teaser: r.teaser, summary: r.summary, sourceName: r.source_name }, authorId);
      if ("error" in res) {
        stats.assess_failed = (stats.assess_failed ?? 0) + 1;
        return;
      }
      const { error: upErr } = await supabase
        .from("news_items")
        .update({
          assessment: res.assessment as unknown as Database["public"]["Tables"]["news_items"]["Update"]["assessment"],
          importance: res.importance,
        })
        .eq("id", r.id)
        .or("assessment.is.null,assessment->>by.eq.ai");
      if (upErr) stats.assess_failed = (stats.assess_failed ?? 0) + 1;
      else stats.items_assessed = (stats.items_assessed ?? 0) + 1;
    }));
  }
}

/**
 * Nur den Nachtrag der Einordnung laufen lassen (stuendlicher Cron ausserhalb
 * der Ticker-Stunde, PR 200). Ohne fehlende Einordnungen gibt es keinen
 * KI-Aufruf. So muss nach «Neu einordnen lassen» oder einem Merge niemand bis
 * zum naechsten Ticker-Lauf warten.
 */
export async function runAssessmentBackfill(): Promise<{ assessed: number; failed: number }> {
  const supabase = createServiceClient();
  const authorId = await resolveSystemAuthorId(supabase, "NEWS_TICKER_AUTHOR_ID");
  if (!authorId) return { assessed: 0, failed: 0 };
  const stats = emptyRefreshStats();
  await backfillAssessments(supabase, authorId, stats);
  return { assessed: stats.items_assessed ?? 0, failed: stats.assess_failed ?? 0 };
}

