"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  ActionResultId,
  AdvertiserInput,
  BookingInput,
  CampaignInput,
  CampaignStatus,
  ContactInput,
  CreativeInput,
} from "@/lib/ads/types";

async function requireEditor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: me } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new Error("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new Error("Nur Editor:innen.");
  return { supabase, editorId: me.id };
}

function mapDbError(error: { code?: string; message?: string } | null): string {
  const msg = error?.message ?? "Unbekannter Fehler.";
  if (msg.includes("Ueberbuchung")) {
    return "Überbuchung: In diesem Zeitraum ist die Platzierung bereits ausgebucht. Bitte Zeitraum oder Platzierung anpassen.";
  }
  if (error?.code === "23505") return "Eintrag bereits vorhanden.";
  if (error?.code === "23514") {
    return "Ungültige Kombination — bitte Eingaben prüfen (House-Kampagne ohne Kunde/Preis, Scope-Referenz nur bei Ressort/Artikel).";
  }
  if (error?.code === "23503") return "Verknüpfter Datensatz fehlt oder ist noch referenziert.";
  return msg;
}

function revalidateAll(id?: string): void {
  revalidatePath("/autor/admin/werbung");
  revalidatePath("/autor/admin/werbung/kunden");
  if (id) revalidatePath(`/autor/admin/werbung/${id}`);
}

function fail(e: unknown): ActionResult & { ok: false } {
  return { ok: false, error: e instanceof Error ? e.message : String(e) };
}

// ── Advertisers ──────────────────────────────────────────────────────────
export async function createAdvertiser(input: AdvertiserInput): Promise<ActionResultId> {
  try {
    const { supabase } = await requireEditor();
    if (!input.name.trim()) return { ok: false, error: "Name ist erforderlich." };
    const { data, error } = await supabase
      .from("ad_advertisers")
      .insert({
        name: input.name.trim(),
        uid: input.uid || null,
        billing_address: input.billing_address || null,
        billing_email: input.billing_email || null,
        is_agency: input.is_agency ?? false,
        commission_pct: input.commission_pct ?? null,
        notes: input.notes || null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll();
    return { ok: true, id: data.id };
  } catch (e) { return fail(e); }
}

export async function updateAdvertiser(id: string, input: AdvertiserInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    const { error } = await supabase
      .from("ad_advertisers")
      .update({
        name: input.name.trim(),
        uid: input.uid || null,
        billing_address: input.billing_address || null,
        billing_email: input.billing_email || null,
        is_agency: input.is_agency ?? false,
        commission_pct: input.commission_pct ?? null,
        notes: input.notes || null,
      })
      .eq("id", id);
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteAdvertiser(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    const { error } = await supabase.from("ad_advertisers").delete().eq("id", id);
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll();
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Contacts ───────────────────────────────────────────────────────────────
export async function createContact(input: ContactInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    if (!input.name.trim()) return { ok: false, error: "Name ist erforderlich." };
    const { error } = await supabase.from("ad_contacts").insert({
      advertiser_id: input.advertiser_id,
      name: input.name.trim(),
      email: input.email || null,
      phone: input.phone || null,
      role: input.role || null,
    });
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll();
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteContact(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    const { error } = await supabase.from("ad_contacts").delete().eq("id", id);
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll();
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Campaigns ────────────────────────────────────────────────────────────
export async function createCampaign(input: CampaignInput): Promise<ActionResultId> {
  try {
    const { supabase } = await requireEditor();
    if (!input.name.trim()) return { ok: false, error: "Name ist erforderlich." };
    if (!input.is_house && !input.advertiser_id) {
      return { ok: false, error: "Kunden-Kampagne braucht einen Kunden." };
    }
    const { data, error } = await supabase
      .from("ad_campaigns")
      .insert({
        name: input.name.trim(),
        is_house: input.is_house,
        advertiser_id: input.is_house ? null : input.advertiser_id ?? null,
        price_chf: input.is_house ? null : input.price_chf ?? null,
        weight: input.weight,
        notes: input.notes || null,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll();
    return { ok: true, id: data.id };
  } catch (e) { return fail(e); }
}

export async function updateCampaign(id: string, input: CampaignInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    if (!input.is_house && !input.advertiser_id) {
      return { ok: false, error: "Kunden-Kampagne braucht einen Kunden." };
    }
    const { error } = await supabase
      .from("ad_campaigns")
      .update({
        name: input.name.trim(),
        is_house: input.is_house,
        advertiser_id: input.is_house ? null : input.advertiser_id ?? null,
        price_chf: input.is_house ? null : input.price_chf ?? null,
        weight: input.weight,
        notes: input.notes || null,
      })
      .eq("id", id);
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll(id);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setCampaignStatus(id: string, status: CampaignStatus): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    const { error } = await supabase.from("ad_campaigns").update({ status }).eq("id", id);
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll(id);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteCampaign(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll();
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Bookings ─────────────────────────────────────────────────────────────
export async function createBooking(input: BookingInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    if (input.scope !== "global" && !input.scope_ref?.trim()) {
      return { ok: false, error: "Scope-Referenz (Ressort/Artikel) ist erforderlich." };
    }
    if (input.scope === "article") {
      const slug = input.scope_ref!.trim();
      const { data: art } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!art) return { ok: false, error: `Artikel-Slug „${slug}" nicht gefunden.` };
    }
    if (!input.from) return { ok: false, error: "Startdatum ist erforderlich." };
    const period = `[${input.from},${input.to ?? ""})`;
    const { error } = await supabase.from("ad_bookings").insert({
      campaign_id: input.campaign_id,
      placement_id: input.placement_id,
      scope: input.scope,
      scope_ref: input.scope === "global" ? null : input.scope_ref!.trim(),
      period,
    });
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll(input.campaign_id);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteBooking(id: string, campaignId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    const { error } = await supabase.from("ad_bookings").delete().eq("id", id);
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll(campaignId);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Creatives (nur kind='internal' in PR 1) ────────────────────────────────
export async function createCreative(input: CreativeInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    if (!input.headline.trim()) return { ok: false, error: "Headline ist erforderlich." };
    if (!input.target_url.trim()) return { ok: false, error: "Ziel-URL ist erforderlich." };
    const { error } = await supabase.from("ad_creatives").insert({
      campaign_id: input.campaign_id,
      kind: "internal",
      variant: input.variant,
      headline: input.headline.trim(),
      body: input.body || null,
      cta_label: input.cta_label || null,
      target_url: input.target_url.trim(),
      is_active: input.is_active ?? true,
    });
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll(input.campaign_id);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function updateCreative(
  id: string,
  campaignId: string,
  input: Omit<CreativeInput, "campaign_id">,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    const { error } = await supabase
      .from("ad_creatives")
      .update({
        variant: input.variant,
        headline: input.headline.trim(),
        body: input.body || null,
        cta_label: input.cta_label || null,
        target_url: input.target_url.trim(),
        is_active: input.is_active ?? true,
      })
      .eq("id", id);
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll(campaignId);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteCreative(id: string, campaignId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    const { error } = await supabase.from("ad_creatives").delete().eq("id", id);
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll(campaignId);
    return { ok: true };
  } catch (e) { return fail(e); }
}
