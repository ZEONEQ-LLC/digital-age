"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type OperationResult = {
  success: true;
  affectedCount: number;
  newSlug?: string;
};

async function requireEditor(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: author } = await supabase
    .from("authors")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!author || author.role !== "editor") {
    throw new Error("Nur Editoren dürfen Tags verwalten.");
  }
}

function mapPgError(e: unknown): Error {
  // RPCs werfen PostgrestError mit `code` (sqlstate) + `message`.
  // Wir mappen die wichtigsten Fälle auf verständliche DE-Messages.
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("23505") || msg.toLowerCase().includes("already exists")) {
    return new Error("Slug ist bereits vergeben.");
  }
  if (msg.includes("42501") || msg.toLowerCase().includes("permission denied")) {
    return new Error("Nur Editoren dürfen Tags verwalten.");
  }
  if (msg.includes("P0002") || msg.toLowerCase().includes("not found")) {
    return new Error("Tag nicht gefunden.");
  }
  if (msg.includes("22023") || msg.toLowerCase().includes("empty")) {
    return new Error("Tag-Name darf nicht leer sein.");
  }
  return e instanceof Error ? e : new Error(msg);
}

export async function renameTag(
  tagId: string,
  newName: string,
): Promise<OperationResult> {
  await requireEditor();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("rename_tag", {
    p_tag_id: tagId,
    p_new_name: newName,
  });
  if (error) throw mapPgError(error);

  const payload = (data ?? {}) as {
    success?: boolean;
    new_slug?: string;
    affected_count?: number;
  };

  revalidatePath("/autor/admin/tags");
  revalidatePath("/tags");
  if (payload.new_slug) {
    revalidatePath(`/tag/${payload.new_slug}`);
  }
  // Listing-Pages mit Top-Themen-Sidebar
  revalidatePath("/ki-im-business");
  revalidatePath("/future-tech");

  return {
    success: true,
    affectedCount: payload.affected_count ?? 0,
    newSlug: payload.new_slug,
  };
}

export async function mergeTag(
  fromId: string,
  toId: string,
): Promise<OperationResult> {
  await requireEditor();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("merge_tags", {
    p_from_id: fromId,
    p_to_id: toId,
  });
  if (error) throw mapPgError(error);

  const payload = (data ?? {}) as {
    success?: boolean;
    affected_count?: number;
  };

  revalidatePath("/autor/admin/tags");
  revalidatePath("/tags");
  revalidatePath("/ki-im-business");
  revalidatePath("/future-tech");

  return {
    success: true,
    affectedCount: payload.affected_count ?? 0,
  };
}

export async function deleteTag(tagId: string): Promise<OperationResult> {
  await requireEditor();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("delete_tag", {
    p_tag_id: tagId,
  });
  if (error) throw mapPgError(error);

  const payload = (data ?? {}) as {
    success?: boolean;
    affected_count?: number;
  };

  revalidatePath("/autor/admin/tags");
  revalidatePath("/tags");
  revalidatePath("/ki-im-business");
  revalidatePath("/future-tech");

  return {
    success: true,
    affectedCount: payload.affected_count ?? 0,
  };
}
