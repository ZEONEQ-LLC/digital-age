"use server";

import { revalidatePath } from "next/cache";
import { FormError, isUniqueViolation, runAction, type ActionResult } from "@/lib/actionResult";
import { requireEditorId } from "@/lib/aiJobs/editor";
import type { Json } from "@/lib/database.types";
import { PLATFORM_CATEGORIES, PLATFORM_HOSTINGS, slugifyPlatform } from "@/lib/platforms/research";
import { createClient } from "@/lib/supabase/server";

// Admin /autor/admin/ki-plattformen: Eintraege pflegen und Aenderungen der KI
// zuruecknehmen. Alles ueber den Session-Client (RLS ai_platforms_editor_all,
// ai_platform_changes_editor_update). Was die Redaktion anfasst, bekommt
// source = 'editor'; «Sperren» haelt die KI davon fern.

const ADMIN = "/autor/admin/ki-plattformen";

function refresh() {
  revalidatePath(ADMIN);
  revalidatePath("/ki-plattformen");
}

export type PlatformInput = {
  name: string;
  category: string;
  tagline: string;
  hosting: string;
  pricing: string;
  url: string;
};

function validate(input: PlatformInput) {
  const name = input.name.trim();
  const tagline = input.tagline.replace(/\s+/g, " ").trim();
  const pricing = input.pricing.trim();
  const url = input.url.trim();
  if (!name || name.length > 60) throw new FormError("Name: 1 bis 60 Zeichen.");
  if (!tagline || tagline.length > 200) throw new FormError("Beschreibung: 1 bis 200 Zeichen.");
  if (!pricing || pricing.length > 40) throw new FormError("Preis: 1 bis 40 Zeichen.");
  if (!(PLATFORM_CATEGORIES as readonly string[]).includes(input.category)) throw new FormError("Unbekannte Kategorie.");
  if (!(PLATFORM_HOSTINGS as readonly string[]).includes(input.hosting)) throw new FormError("Unbekanntes Hosting.");
  if (url && !/^https:\/\/[^\s/]+\.[^\s]+$/i.test(url)) throw new FormError("Link muss mit https:// beginnen (leer = kein Link).");
  return { name, category: input.category, tagline, hosting: input.hosting, pricing, url: url || null };
}

export async function savePlatform(id: string, input: PlatformInput): Promise<ActionResult<null>> {
  return runAction("platforms.save", async () => {
    await requireEditorId();
    const fields = validate(input);
    const supabase = await createClient();
    const { error } = await supabase.from("ai_platforms").update({ ...fields, source: "editor" }).eq("id", id);
    if (error) throw error;
    refresh();
    return null;
  });
}

export async function createPlatform(input: PlatformInput): Promise<ActionResult<null>> {
  return runAction(
    "platforms.create",
    async () => {
      await requireEditorId();
      const fields = validate(input);
      const supabase = await createClient();
      const { error } = await supabase
        .from("ai_platforms")
        .insert({ ...fields, slug: slugifyPlatform(fields.name), source: "editor", verified_at: new Date().toISOString() });
      if (error) throw error;
      refresh();
      return null;
    },
    (e) => (isUniqueViolation(e, "ai_platforms_slug_key") ? "Eine Plattform mit diesem Namen gibt es schon (auch archivierte zählen)." : null),
  );
}

export async function setPlatformFlags(
  id: string,
  flags: { featured?: boolean; locked?: boolean; status?: "active" | "archived" },
): Promise<ActionResult<null>> {
  return runAction("platforms.flags", async () => {
    await requireEditorId();
    const patch: { featured?: boolean; locked?: boolean; status?: string; source?: string } = {};
    if (typeof flags.featured === "boolean") patch.featured = flags.featured;
    if (typeof flags.locked === "boolean") patch.locked = flags.locked;
    if (flags.status === "active" || flags.status === "archived") { patch.status = flags.status; patch.source = "editor"; }
    if (Object.keys(patch).length === 0) return null;
    const supabase = await createClient();
    const { error } = await supabase.from("ai_platforms").update(patch).eq("id", id);
    if (error) throw error;
    refresh();
    return null;
  });
}

const RESTORABLE = ["name", "category", "tagline", "hosting", "pricing", "url", "status"] as const;

// Aenderung der KI zuruecknehmen: Update → Vorher-Werte, Neuaufnahme →
// archivieren, Archivierung → wieder aktiv. Der Eintrag wird danach gesperrt,
// damit die KI dieselbe Aenderung naechste Woche nicht wiederholt.
export async function revertPlatformChange(changeId: string): Promise<ActionResult<null>> {
  return runAction("platforms.revert", async () => {
    await requireEditorId();
    const supabase = await createClient();
    const { data: change, error } = await supabase
      .from("ai_platform_changes")
      .select("id, platform_id, action, before, reverted_at")
      .eq("id", changeId)
      .maybeSingle();
    if (error) throw error;
    if (!change) throw new FormError("Änderung nicht gefunden.");
    if (change.reverted_at) throw new FormError("Diese Änderung ist schon zurückgenommen.");
    if (!change.platform_id) throw new FormError("Die Plattform gibt es nicht mehr.");

    let patch: Record<string, Json> = {};
    if (change.action === "add") patch = { status: "archived" };
    else if (change.action === "archive") patch = { status: "active" };
    else {
      const before = (change.before && typeof change.before === "object" && !Array.isArray(change.before) ? change.before : {}) as Record<string, Json>;
      for (const k of RESTORABLE) if (k in before) patch[k] = before[k];
    }
    const { error: upErr } = await supabase
      .from("ai_platforms")
      .update({ ...patch, locked: true, source: "editor" })
      .eq("id", change.platform_id);
    if (upErr) throw upErr;
    const { error: markErr } = await supabase
      .from("ai_platform_changes")
      .update({ reverted_at: new Date().toISOString() })
      .eq("id", change.id);
    if (markErr) throw markErr;
    refresh();
    return null;
  });
}
