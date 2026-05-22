import PageTitle from "@/components/author/PageTitle";
import { getAllSources, getNewsTickerConfig } from "@/lib/newsTickerApi";
import SourcesSection from "./SourcesSection";
import PromptSection from "./PromptSection";

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

  return (
    <>
      <PageTitle
        title="News-Ticker"
        subtitle="RSS-Quellen + Generation-Prompt für den AI-News-Ticker. Editor-only."
      />

      <SourcesSection sources={sources} />

      <div style={{ height: 40 }} />

      <PromptSection
        initialPrompt={config?.generation_prompt ?? ""}
        lastRefreshLabel={lastRefreshLabel}
      />
    </>
  );
}
