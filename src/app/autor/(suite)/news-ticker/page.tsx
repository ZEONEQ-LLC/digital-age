import PageTitle from "@/components/author/PageTitle";
import { getAllSources, getNewsTickerConfig } from "@/lib/newsTickerApi";
import type { TickerSettings } from "@/lib/newsTickerActions";
import SourcesSection from "./SourcesSection";
import PromptSection from "./PromptSection";
import RefreshSection from "./RefreshSection";
import SettingsSection from "./SettingsSection";

const DEFAULT_SETTINGS: TickerSettings = {
  ticker_speed: "normal",
  items_per_source: 10,
  is_paused: false,
  scheduler_enabled: false,
  scheduled_hour_cet: 7,
};

export default async function NewsTickerAdminPage() {
  const [sources, config] = await Promise.all([
    getAllSources(),
    getNewsTickerConfig(),
  ]);

  const lastRefreshLabel = config?.last_refresh_at
    ? new Date(config.last_refresh_at).toLocaleString("de-CH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "noch nie";

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
        subtitle="RSS-Quellen + Generation-Prompt für den AI-News-Ticker. Editor-only."
      />

      <RefreshSection lastRefreshLabel={lastRefreshLabel} />

      <div style={{ height: 40 }} />

      <SettingsSection initial={settings} />

      <div style={{ height: 40 }} />

      <SourcesSection sources={sources} />

      <div style={{ height: 40 }} />

      <PromptSection
        initialPrompt={config?.generation_prompt ?? ""}
        lastRefreshLabel={lastRefreshLabel}
      />
    </>
  );
}
