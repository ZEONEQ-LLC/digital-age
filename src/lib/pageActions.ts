"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/database.types";
import type { BlockDocument } from "@/types/blocks";

type PageRow = Database["public"]["Tables"]["pages"]["Row"];
type PageInsert = Database["public"]["Tables"]["pages"]["Insert"];
type PageUpdate = Database["public"]["Tables"]["pages"]["Update"];

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
  if (me.role !== "editor") throw new Error("Nur Editor:innen dürfen Seiten verwalten.");
}

const SLUG_RE = /^[a-z0-9-]+$/;

function validateSlug(slug: string): string | null {
  if (!slug || slug.length > 80) return "Slug muss zwischen 1 und 80 Zeichen sein.";
  if (!SLUG_RE.test(slug)) return "Slug darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.";
  return null;
}

export type PagePatch = {
  title?: string;
  slug?: string;
  lead?: string | null;
  body_blocks?: BlockDocument;
  meta_description?: string | null;
  noindex?: boolean;
  hero_category?: string | null;
  status?: "draft" | "published";
};

export async function createPage(args: { slug: string; title: string }): Promise<{ id: string }> {
  await requireEditor();
  const slugErr = validateSlug(args.slug);
  if (slugErr) throw new Error(slugErr);

  const supabase = await createClient();
  const insert: PageInsert = {
    slug: args.slug,
    title: args.title,
  };
  const { data, error } = await supabase
    .from("pages")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Slug ist bereits vergeben.");
    throw error;
  }
  revalidatePath("/autor/seiten");
  return { id: data.id };
}

export async function savePage(id: string, patch: PagePatch): Promise<PageRow> {
  await requireEditor();
  if (patch.slug !== undefined) {
    const slugErr = validateSlug(patch.slug);
    if (slugErr) throw new Error(slugErr);
  }

  const supabase = await createClient();
  const update: PageUpdate = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.lead !== undefined) update.lead = patch.lead;
  if (patch.body_blocks !== undefined) update.body_blocks = patch.body_blocks as unknown as Json;
  if (patch.meta_description !== undefined) update.meta_description = patch.meta_description;
  if (patch.noindex !== undefined) update.noindex = patch.noindex;
  if (patch.hero_category !== undefined) update.hero_category = patch.hero_category;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabase
    .from("pages")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Slug ist bereits vergeben.");
    throw error;
  }
  revalidatePath("/autor/seiten");
  revalidatePath(`/autor/seiten/${id}`);
  if (data.slug) revalidatePath(`/${data.slug}`);
  return data;
}

export async function deletePage(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("pages")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/autor/seiten");
  if (existing?.slug) revalidatePath(`/${existing.slug}`);
}
