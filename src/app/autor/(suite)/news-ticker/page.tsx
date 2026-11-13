import PageTitle from "@/components/author/PageTitle";
import { getAllSources, getLatestNewsItemAt, getNewsTickerConfig, getRecentNewsItemsForAdmin } from "@/lib/newsTickerApi";
import { readAssessment, readImportance } from "@/lib/newsTicker/assessment";
import ItemsSection, { type AdminNewsItem } from "./ItemsSection";
import { parseRefreshStats } from "@/lib/newsTicker/stats";
import type { TickerSettings } from "@/lib/newsTickerActions";
import SourcesSection from "./SourcesSection";
import PromptSection from "./PromptSection";
import RefreshSection from "./RefreshSection";
import SettingsSection from "./SettingsSection";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_SETTINGS: TickerSettings = {
  ticker_speed: "normal",
  items_per_source: 10,
  is_paused: false,
  scheduler_enabled: false,
  scheduled_hour_cet: 7,
};

// Modellwahl des News-Tickers (Task news_item_generation) liegt seit PR 190
// hier statt in der AI-Konfiguration. Gespeichert wird weiter in
// ai_config.task_model_overrides; "" = Standard-Modell der AI-Konfiguration.
async function getNewsTickerModel(): Promise<{ model: string; defaultModel: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_config")
    .select("default_model, task_model_overrides")
    .eq("id", "global")
    .maybeSingle();
  const raw = data?.task_model_overrides;
  const v =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>).news_item_generation
      : undefined;
  return { model: typeof v === "string" ? v : "", defaultModel: data?.default_model ?? "" };
}

// Ab so vielen Tagen ohne neuen Eintrag markiert der Admin den Ticker orange.
const STALE_AFTER_DAYS = 3;

function olderThanDays(iso: string, days: number): boolean {
  return Date.now() - new Date(iso).getTime() > days * 86_400_000;
}

export default async function NewsTickerAdminPage() {
  const [sources, config, modelInfo, latestItemAt, recentItems] = await Promise.all([
    getAllSources(),
    getNewsTickerConfig(),
    getNewsTickerModel(),
    getLatestNewsItemAt(),
    getRecentNewsItemsForAdmin(40),
  ]);

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("de-CH", {
      timeZone: "Europe/Zurich",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  const lastRefreshLabel = config?.last_refresh_at ? formatDateTime(config.last_refresh_at) : "noch nie";
  const lastStats = parseRefreshStats(config?.last_refresh_stats);
  const latestItem = latestItemAt
    ? { label: formatDateTime(latestItemAt), stale: olderThanDays(latestItemAt, STALE_AFTER_DAYS) }
    : null;

  const adminItems: AdminNewsItem[] = recentItems.map((it) => ({
    id: it.id,
    title: it.title,
    summary: it.summary,
    sourceName: it.source_name,
    sourceUrl: it.source_url,
    timeLabel: it.published_at
      ? new Date(it.published_at).toLocaleString("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "–",
    hidden: it.status !== "approved",
    assessment: readAssessment(it.assessment),
    importance: readImportance(it.importance),
  }));

  const settings: TickerSettings = config
    ? {
        ticker_speed:
          config.ticker_speed === "slow" || config.ticker_speed === "fast"
            ? (config.ticker_speed as TickerSettings["ticker_speed"])
            : "normal",
        items_per_source: config.items_per_source ?? DEFAULT_SETTINGS.items_per_source,
        is_paused: config.is_paused ?? DEFAULT_SETTINGS.is_paused,
        scheduler_enabled: config.scheduler_enabled ?? DEFAULT_SETTINGS.scheduler_enabled,
        scheduled_hour_cet: config.scheduled_hour_cet ?? DEFAULT_SETTINGS.scheduled_hour_cet,
      }
    : DEFAULT_SETTINGS;

  return (
    <>
      <PageTitle
        title="News-Ticker"
        subtitle="RSS-Quellen, Prompt und Modell für den KI-News-Ticker. Nur für Editoren."
      />

      <RefreshSection lastRefreshLabel={lastRefreshLabel} lastStats={lastStats} latestItem={latestItem} />

      <div style={{ height: 40 }} />

      <ItemsSection items={adminItems} />

      <div style={{ height: 40 }} />

      <SettingsSection initial={settings} />

      <div style={{ height: 40 }} />

      <SourcesSection sources={sources} />

      <div style={{ height: 40 }} />

      <PromptSection
        initialPrompt={config?.generation_prompt ?? ""}
        lastRefreshLabel={lastRefreshLabel}
        initialModel={modelInfo.model}
        defaultModel={modelInfo.defaultModel}
      />
    </>
  );
}
