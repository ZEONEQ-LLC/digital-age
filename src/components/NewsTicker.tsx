import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createServiceClient } from "@/lib/supabase/service";
import NewsTickerClient, { type TickerItem, type TickerSpeed } from "./NewsTickerClient";

// Server-Component: holt News-Items (Anon-Key, RLS
// `news_items_public_read_approved`; gleiches Pattern wie sitemap und
// tag/[slug]) und die Anzeige-Settings aus der Config-Row. Die Config ist
// RLS-seitig Editor-only — anon liest null. Deshalb liest loadConfig sie
// mit dem Service-Role-Client (nur ticker_speed + is_paused, kein
// cookies()/headers(): die Komponente bleibt statisch renderbar).
// Quellen-Name kommt aus dem denormalisierten `source_name` auf
// news_items — der Embed über `news_sources(name)` wurde durch anon-RLS
// blockiert.

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
  const [cfg, itemsRes] = await Promise.all([
    loadConfig(),
    supabase
      .from("news_items")
      .select("id, title, teaser, summary, category, source_url, source_name")
      .eq("status", "approved")
      .order("published_at", { ascending: false })
      .limit(30),
  ]);

  const { speed, isPaused } = cfg;

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

// Config Editor-only per RLS → Service-Role, nur die zwei Anzeige-Felder.
// Fehlt der Key (z. B. lokaler Build ohne .env), Defaults statt Throw:
// das Root-Layout rendert statische Seiten mit dieser Komponente.
async function loadConfig(): Promise<{ speed: TickerSpeed; isPaused: boolean }> {
  const fallback: { speed: TickerSpeed; isPaused: boolean } = { speed: "normal", isPaused: false };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return fallback;
  try {
    const { data } = await createServiceClient()
      .from("news_ticker_config")
      .select("ticker_speed, is_paused")
      .eq("id", 1)
      .maybeSingle();
    const speed: TickerSpeed =
      data?.ticker_speed === "slow" || data?.ticker_speed === "fast"
        ? (data.ticker_speed as TickerSpeed)
        : "normal";
    return { speed, isPaused: data?.is_paused ?? false };
  } catch {
    return fallback;
  }
}
