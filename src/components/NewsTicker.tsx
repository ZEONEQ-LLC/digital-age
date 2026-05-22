import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import NewsTickerClient, { type TickerItem, type TickerSpeed } from "./NewsTickerClient";

// Server-Component: holt News-Items + Anzeige-Settings aus der Config-Row.
// Direkter @supabase/supabase-js mit Anon-Key (gleiches Pattern wie sitemap
// und tag/[slug]); RLS `news_items_public_read_approved` und implizite
// Config-Lesbarkeit reichen aus. Quellen-Name kommt jetzt aus dem
// denormalisierten `source_name` auf news_items — der Embed über
// `news_sources(name)` wurde durch anon-RLS blockiert.

export default async function NewsTicker() {
  const { items, speed, isPaused, limit } = await loadTicker();
  if (isPaused) return null;
  if (items.length === 0) return null;
  return <NewsTickerClient items={items} speed={speed} limit={limit} />;
}

async function loadTicker(): Promise<{
  items: TickerItem[];
  speed: TickerSpeed;
  isPaused: boolean;
  limit: number;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { items: [], speed: "normal", isPaused: false, limit: 30 };
  }

  const supabase = createSupabaseClient<Database>(url, key);

  // Config + Items parallel. Config-Row ist Singleton.
  const [cfgRes, itemsRes] = await Promise.all([
    supabase
      .from("news_ticker_config")
      .select("ticker_speed, is_paused")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("news_items")
      .select("id, title, teaser, summary, category, source_url, source_name")
      .eq("status", "approved")
      .order("published_at", { ascending: false })
      .limit(30),
  ]);

  const cfg = cfgRes.data;
  const speed: TickerSpeed =
    cfg?.ticker_speed === "slow" || cfg?.ticker_speed === "fast"
      ? (cfg.ticker_speed as TickerSpeed)
      : "normal";
  const isPaused = cfg?.is_paused ?? false;

  const items: TickerItem[] = (itemsRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    teaser: row.teaser,
    summary: row.summary,
    category: row.category,
    source_url: row.source_url,
    source_name: row.source_name ?? "Externe Quelle",
  }));

  return { items, speed, isPaused, limit: 30 };
}
