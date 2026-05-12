import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type PromptRow = Database["public"]["Tables"]["ai_prompts"]["Row"];
export type PromptStatus = Database["public"]["Enums"]["prompt_status"];
export type PromptDifficulty = Database["public"]["Enums"]["prompt_difficulty"];
type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];

export type PromptWithAuthor = PromptRow & {
  author: Pick<AuthorRow, "id" | "display_name" | "slug" | "handle" | "avatar_url"> | null;
};

export type PromptFilters = {
  category?: string;
  tested_with?: string;
  difficulty?: PromptDifficulty;
};

const AUTHOR_SELECT = "author:authors!author_id(id, display_name, slug, handle, avatar_url)";

export async function getPublishedPrompts(filters?: PromptFilters): Promise<PromptWithAuthor[]> {
  const supabase = await createClient();
  let query = supabase
    .from("ai_prompts")
    .select(`*, ${AUTHOR_SELECT}`)
    .in("status", ["published", "featured"])
    .order("status", { ascending: false }) // featured (alpha-later) … OR: order via custom expression
    .order("published_at", { ascending: false, nullsFirst: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.tested_with) query = query.eq("tested_with", filters.tested_with);
  if (filters?.difficulty) query = query.eq("difficulty", filters.difficulty);

  const { data, error } = await query;
  if (error) throw error;
  // Featured zuerst — Postgres enum sort kann tricky sein; in TS resorten
  const rows = (data as PromptWithAuthor[] | null) ?? [];
  return rows.sort((a, b) => {
    if (a.status === "featured" && b.status !== "featured") return -1;
    if (a.status !== "featured" && b.status === "featured") return 1;
    const at = a.published_at ?? a.created_at;
    const bt = b.published_at ?? b.created_at;
    return new Date(bt).getTime() - new Date(at).getTime();
  });
}

export async function getFeaturedPrompts(limit = 3): Promise<PromptWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_prompts")
    .select(`*, ${AUTHOR_SELECT}`)
    .eq("status", "featured")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data as PromptWithAuthor[] | null) ?? [];
}

export async function getPromptById(id: string): Promise<PromptWithAuthor | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_prompts")
    .select(`*, ${AUTHOR_SELECT}`)
    .eq("id", id)
    .maybeSingle();
  return (data as PromptWithAuthor | null) ?? null;
}

export async function getMyPrompts(): Promise<PromptWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_prompts")
    .select(`*, ${AUTHOR_SELECT}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as PromptWithAuthor[] | null) ?? [];
}

export async function getAllPromptsForAdmin(): Promise<PromptWithAuthor[]> {
  // Editor-only; RLS macht den Schnitt automatisch (editor_all-Policy)
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_prompts")
    .select(`*, ${AUTHOR_SELECT}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as PromptWithAuthor[] | null) ?? [];
}

export async function getPromptCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_prompts")
    .select("category")
    .in("status", ["published", "featured"]);
  if (error) throw error;
  const unique = new Set((data ?? []).map((r) => r.category));
  return Array.from(unique).sort();
}

export async function getPendingPromptCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("ai_prompts")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}
