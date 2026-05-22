import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type NewsSourceRow = Database["public"]["Tables"]["news_sources"]["Row"];
export type NewsTickerConfigRow =
  Database["public"]["Tables"]["news_ticker_config"]["Row"];

// Editor-only Reads. RLS-Policies erlauben anon hier nichts; falls die
// Funktion versehentlich öffentlich gerufen wird, kommt einfach ein leeres
// Array bzw. null zurück.
export async function getAllSources(): Promise<NewsSourceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_sources")
    .select("*")
    .order("name", { ascending: true });
  return data ?? [];
}

export async function getSourceById(id: string): Promise<NewsSourceRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_sources")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getNewsTickerConfig(): Promise<NewsTickerConfigRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_ticker_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return data;
}
