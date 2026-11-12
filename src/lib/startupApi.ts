// Gemischt: 5 Public-Read-Funktionen (getPublishedStartups,
// getFeaturedStartups, getStartupBySlug, getStartupIndustries,
// getStartupCities) am Anon-Client. Admin-Read + Pending-Count bleiben
// am ssr-Client (RLS-Editor-Schnitt).
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/database.types";

export type StartupRow = Database["public"]["Tables"]["ai_startups"]["Row"];

// Oeffentliche Spalten. Einreicher-Daten (Name, E-Mail, Rolle) und interne
// Pruefdaten gehoeren nicht in Public-Reads; seit PR 194 darf anon sie per
// Spaltenrechten auch gar nicht mehr lesen (Migration 20261112100000), ein
// select("*") am Anon-Client wuerde dann scheitern.
export const PUBLIC_STARTUP_COLUMNS =
  "id, slug, name, tagline, description, website, logo_url, swiss_status, industry, city, employee_range, founded_year, funding_stage, total_funding_range, last_round_at, open_to_investment, pitch_deck_url, founder_names, status, published_at, created_at, updated_at";

export type PublicStartupRow = Omit<
  StartupRow,
  "submitter_name" | "submitter_email" | "submitter_role" | "reviewed_by_id" | "reviewed_at" | "rejection_reason"
>;
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

// PUBLIC: status in (published, featured).
export async function getPublishedStartups(filters?: StartupFilters): Promise<PublicStartupRow[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("ai_startups")
    .select(PUBLIC_STARTUP_COLUMNS)
    .in("status", ["published", "featured"])
    .order("published_at", { ascending: false, nullsFirst: false });

  if (filters?.swiss_status) query = query.eq("swiss_status", filters.swiss_status);
  if (filters?.industry) query = query.eq("industry", filters.industry);
  if (filters?.employee_range) query = query.eq("employee_range", filters.employee_range);
  if (filters?.city) query = query.eq("city", filters.city);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as PublicStartupRow[];
  // Featured zuerst, dann nach published_at
  return rows.sort((a, b) => {
    if (a.status === "featured" && b.status !== "featured") return -1;
    if (a.status !== "featured" && b.status === "featured") return 1;
    const at = a.published_at ?? a.created_at;
    const bt = b.published_at ?? b.created_at;
    return new Date(bt).getTime() - new Date(at).getTime();
  });
}

// PUBLIC: status=featured.
export async function getFeaturedStartups(limit = 3): Promise<PublicStartupRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("ai_startups")
    .select(PUBLIC_STARTUP_COLUMNS)
    .eq("status", "featured")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PublicStartupRow[];
}

// PUBLIC: status in (published, featured).
export async function getStartupBySlug(slug: string): Promise<PublicStartupRow | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("ai_startups")
    .select(PUBLIC_STARTUP_COLUMNS)
    .eq("slug", slug)
    .in("status", ["published", "featured"])
    .maybeSingle();
  return (data as PublicStartupRow | null) ?? null;
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

// PUBLIC: status in (published, featured).
export async function getStartupIndustries(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("ai_startups")
    .select("industry")
    .in("status", ["published", "featured"]);
  if (error) throw error;
  const unique = new Set((data ?? []).map((r) => r.industry));
  return Array.from(unique).sort();
}

// PUBLIC: status in (published, featured).
export async function getStartupCities(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("ai_startups")
    .select("city")
    .in("status", ["published", "featured"]);
  if (error) throw error;
  const unique = new Set((data ?? []).map((r) => r.city));
  return Array.from(unique).sort();
}
