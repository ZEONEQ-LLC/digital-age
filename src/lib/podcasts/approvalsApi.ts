import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PodcastRow } from "@/lib/podcastApi";

// Lesepfade fuer die Freigaben-Seite. Offen = Entwurf aus dem Ingest
// (is_published false, ingest_status gesetzt). Manuell angelegte, noch nicht
// veroeffentlichte Eintraege gehoeren nicht hierher. Editor liest per RLS alles.
export type ApprovalItem = PodcastRow & {
  recommended_by: { id: string; display_name: string } | null;
};

export async function getPendingApprovals(): Promise<ApprovalItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("podcasts")
    .select("*, recommended_by:authors!recommended_by_id(id, display_name)")
    .eq("is_published", false)
    .not("ingest_status", "is", null)
    .order("recommended_at", { ascending: false });
  if (error) {
    console.error("[freigaben] Laden fehlgeschlagen:", error.message);
    return [];
  }
  return (data as unknown as ApprovalItem[]) ?? [];
}

export async function getPendingApprovalsCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("podcasts")
      .select("id", { count: "exact", head: true })
      .eq("is_published", false)
      .not("ingest_status", "is", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}
