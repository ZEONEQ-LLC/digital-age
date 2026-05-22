import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import NewsTickerClient, { type TickerItem } from "./NewsTickerClient";

// Server-Component: holt die letzten 30 approved news_items + Quellen-Namen
// und reicht sie an die Client-Komponente. Direkter @supabase/supabase-js-
// Client mit Anon-Key (gleiches Pattern wie sitemap.ts / tag/[slug]) —
// vermeidet `cookies()` zur Build-Zeit, RLS `news_items_public_read_approved`
// erlaubt anon SELECT.
const TICKER_LIMIT = 30;

export default async function NewsTicker() {
  const items = await fetchTickerItems();
  if (items.length === 0) return null;
  return <NewsTickerClient items={items} />;
}

async function fetchTickerItems(): Promise<TickerItem[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const supabase = createSupabaseClient<Database>(url, key);
  const { data, error } = await supabase
    .from("news_items")
    .select("id, title, teaser, summary, category, source_url, news_sources(name)")
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .limit(TICKER_LIMIT);

  if (error || !data) return [];

  // Supabase-Embed liefert `news_sources` als Objekt oder Array, je nach
  // FK-Direction. Defensiv beide Formen behandeln.
  return data.map((row) => {
    const src = row.news_sources as { name: string } | { name: string }[] | null;
    const sourceName = Array.isArray(src) ? src[0]?.name : src?.name;
    return {
      id: row.id,
      title: row.title,
      teaser: row.teaser,
      summary: row.summary,
      category: row.category,
      source_url: row.source_url,
      source_name: sourceName ?? "Externe Quelle",
    };
  });
}
