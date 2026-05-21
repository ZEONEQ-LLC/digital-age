"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type NewsSourceRow = Database["public"]["Tables"]["news_sources"]["Row"];
type NewsSourceInsert = Database["public"]["Tables"]["news_sources"]["Insert"];
type NewsSourceUpdate = Database["public"]["Tables"]["news_sources"]["Update"];

async function requireEditor(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: me } = await supabase
    .from("authors")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new Error("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new Error("Nur Editor:innen dürfen den News-Ticker verwalten.");
}

const URL_RE = /^https?:\/\/[^\s]+$/i;
const LANGUAGES = ["de", "en", "fr", "it"] as const;
const COUNTRIES = ["CH", "DE", "AT", "INT"] as const;
const SOURCE_TYPES = ["rss", "atom", "html"] as const;

export type SourcePatch = {
  name: string;
  url: string;
  source_type: (typeof SOURCE_TYPES)[number];
  language: (typeof LANGUAGES)[number];
  country: (typeof COUNTRIES)[number] | null;
  default_category: string | null;
  is_active: boolean;
};

function validatePatch(p: SourcePatch): string | null {
  if (!p.name.trim() || p.name.length > 100) {
    return "Name muss zwischen 1 und 100 Zeichen sein.";
  }
  if (!URL_RE.test(p.url)) {
    return "URL muss mit http:// oder https:// beginnen.";
  }
  if (!SOURCE_TYPES.includes(p.source_type)) {
    return "Ungültiger Quellen-Typ.";
  }
  if (!LANGUAGES.includes(p.language)) {
    return "Ungültige Sprache.";
  }
  if (p.country !== null && !COUNTRIES.includes(p.country)) {
    return "Ungültiges Land.";
  }
  return null;
}

export async function createSource(patch: SourcePatch): Promise<{ id: string }> {
  await requireEditor();
  const err = validatePatch(patch);
  if (err) throw new Error(err);

  const supabase = await createClient();
  const insert: NewsSourceInsert = {
    name: patch.name.trim(),
    url: patch.url.trim(),
    source_type: patch.source_type,
    language: patch.language,
    country: patch.country,
    default_category: patch.default_category,
    is_active: patch.is_active,
  };

  const { data, error } = await supabase
    .from("news_sources")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Diese URL ist bereits als Quelle angelegt.");
    throw error;
  }
  revalidatePath("/autor/news-ticker");
  return { id: data.id };
}

export async function updateSource(
  id: string,
  patch: SourcePatch,
): Promise<NewsSourceRow> {
  await requireEditor();
  const err = validatePatch(patch);
  if (err) throw new Error(err);

  const supabase = await createClient();
  const update: NewsSourceUpdate = {
    name: patch.name.trim(),
    url: patch.url.trim(),
    source_type: patch.source_type,
    language: patch.language,
    country: patch.country,
    default_category: patch.default_category,
    is_active: patch.is_active,
  };

  const { data, error } = await supabase
    .from("news_sources")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Diese URL ist bereits als Quelle angelegt.");
    throw error;
  }
  revalidatePath("/autor/news-ticker");
  return data;
}

export async function deleteSource(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase.from("news_sources").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/autor/news-ticker");
}

export async function saveGenerationPrompt(prompt: string): Promise<void> {
  await requireEditor();
  if (!prompt.trim()) throw new Error("Der Prompt darf nicht leer sein.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("news_ticker_config")
    .update({ generation_prompt: prompt })
    .eq("id", 1);

  if (error) throw error;
  revalidatePath("/autor/news-ticker");
}
