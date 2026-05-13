import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type StartupRow = Database["public"]["Tables"]["ai_startups"]["Row"];
export type StartupStatus = Database["public"]["Enums"]["startup_status"];
export type SwissStatusCode = Database["public"]["Enums"]["swiss_status"];
export type EmployeeRangeCode = Database["public"]["Enums"]["employee_range"];
export type FundingStageCode = Database["public"]["Enums"]["funding_stage"];

export type StartupFilters = {
  swiss_status?: SwissStatusCode;
  industry?: string;
  employee_range?: EmployeeRangeCode;
  city?: string;
};

export async function getPublishedStartups(filters?: StartupFilters): Promise<StartupRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("ai_startups")
    .select("*")
    .in("status", ["published", "featured"])
    .order("published_at", { ascending: false, nullsFirst: false });

  if (filters?.swiss_status) query = query.eq("swiss_status", filters.swiss_status);
  if (filters?.industry) query = query.eq("industry", filters.industry);
  if (filters?.employee_range) query = query.eq("employee_range", filters.employee_range);
  if (filters?.city) query = query.eq("city", filters.city);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as StartupRow[];
  // Featured zuerst, dann nach published_at
  return rows.sort((a, b) => {
    if (a.status === "featured" && b.status !== "featured") return -1;
    if (a.status !== "featured" && b.status === "featured") return 1;
    const at = a.published_at ?? a.created_at;
    const bt = b.published_at ?? b.created_at;
    return new Date(bt).getTime() - new Date(at).getTime();
  });
}

export async function getFeaturedStartups(limit = 3): Promise<StartupRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_startups")
    .select("*")
    .eq("status", "featured")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as StartupRow[];
}

export async function getStartupBySlug(slug: string): Promise<StartupRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_startups")
    .select("*")
    .eq("slug", slug)
    .in("status", ["published", "featured"])
    .maybeSingle();
  return (data as StartupRow | null) ?? null;
}

export async function getAllStartupsForAdmin(): Promise<StartupRow[]> {
  // Editor-only durch RLS gated (editor_all-Policy)
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_startups")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StartupRow[];
}

export async function getPendingStartupCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("ai_startups")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

export async function getStartupIndustries(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_startups")
    .select("industry")
    .in("status", ["published", "featured"]);
  if (error) throw error;
  const unique = new Set((data ?? []).map((r) => r.industry));
  return Array.from(unique).sort();
}

export async function getStartupCities(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_startups")
    .select("city")
    .in("status", ["published", "featured"]);
  if (error) throw error;
  const unique = new Set((data ?? []).map((r) => r.city));
  return Array.from(unique).sort();
}
