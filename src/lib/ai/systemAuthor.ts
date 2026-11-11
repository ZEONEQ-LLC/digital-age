import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Author, dem Hintergrund-Jobs ohne Session (Cron, Bearer-Routen) ihre
// KI-Kosten im ai_usage_log zuschreiben: feste Author-ID aus der Env-Variable
// `envVar`, sonst der älteste Editor. Eine gesetzte, aber falsche ID wird
// geloggt und fällt auf den Editor zurück, statt den Job zu stoppen.
export async function resolveSystemAuthorId(
  supabase: SupabaseClient<Database>,
  envVar: string,
): Promise<string | null> {
  const fixed = process.env[envVar]?.trim();
  if (fixed) {
    const { data } = await supabase.from("authors").select("id").eq("id", fixed).maybeSingle();
    if (data) return data.id;
    console.error(`[ai] ${envVar} zeigt auf keinen Author, Fallback erster Editor.`);
  }
  const { data } = await supabase
    .from("authors")
    .select("id")
    .eq("role", "editor")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
