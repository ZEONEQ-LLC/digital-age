"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import {
  RESSORT_SLUGS,
  normalizeUid,
  type ActionResult,
  type ActionResultId,
  type AdvertiserInput,
  type BookingInput,
  type CampaignInput,
  type CampaignStatus,
  type ContactInput,
  type CreativeInput,
} from "@/lib/ads/types";
import { PLACEMENTS, isPlacementCode } from "@/lib/ads/placements";

type AdvertiserInsert = Database["public"]["Tables"]["ad_advertisers"]["Insert"];

// ── Validierung (serverseitig; das Formular ist nur Komfort) ──────────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidWeight(w: unknown): w is number {
  return typeof w === "number" && Number.isInteger(w) && w >= 1 && w <= 10;
}

// null/undefined = kein Preis; NaN oder negativ = Fehler.
function parsePrice(p: number | null | undefined): { ok: true; value: number | null } | { ok: false } {
  if (p === null || p === undefined) return { ok: true, value: null };
  if (typeof p !== "number" || Number.isNaN(p) || p < 0) return { ok: false };
  return { ok: true, value: p };
}

function isValidTargetUrl(u: string): boolean {
  return u.startsWith("/") || u.startsWith("http://") || u.startsWith("https://");
}

// Baut das DB-Payload aus dem AdvertiserInput (UID normalisiert, Adressfelder).
// Gibt bei ungueltiger Eingabe einen Fehlerstring zurueck.
function buildAdvertiserPayload(input: AdvertiserInput): { error: string } | { data: AdvertiserInsert } {
  const rawUid = input.uid?.trim();
  const uid = normalizeUid(rawUid);
  if (rawUid && !uid) {
    return { error: "UID ungültig — Format CHE123456789 (HR-/MWST-Suffix wird nicht gespeichert)." };
  }
  const terms = input.payment_terms_days ?? 30;
  if (!Number.isInteger(terms) || terms < 0) {
    return { error: "Zahlungsziel ungültig — ganze Zahl ≥ 0 (Tage)." };
  }
  const data: AdvertiserInsert = {
    name: input.name.trim(),
    uid,
    address_addition: input.address_addition || null,
    street: input.street || null,
    house_number: input.house_number || null,
    post_office_box: input.post_office_box || null,
    postal_code: input.postal_code || null,
    city: input.city || null,
    country: (input.country || "CH").toUpperCase().slice(0, 2),
    language: input.language || "de",
    billing_email: input.billing_email || null,
    payment_terms_days: terms,
    billing_via_agency_id: input.billing_via_agency_id || null,
    is_agency: input.is_agency ?? false,
    commission_pct: input.commission_pct ?? null,
    notes: input.notes || null,
  };
  return { data };
}

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

// Trigger-RAISE-Meldungen sind bereits deutsch + user-tauglich → durchreichen.
const PASSTHROUGH_PREFIXES = [
  "Kampagne kann nicht aktiviert",
  "Rechnung ueber Agentur",
  "Kampagnenart",
  "Diese Platzierung ist nur",
];

function mapDbError(error: { code?: string; message?: string } | null): string {
  const msg = error?.message ?? "Unbekannter Fehler.";
  if (msg.includes("Ueberbuchung")) {
    return "Überbuchung: In diesem Zeitraum ist die Platzierung bereits ausgebucht. Bitte Zeitraum oder Platzierung anpassen.";
  }
  if (PASSTHROUGH_PREFIXES.some((p) => msg.startsWith(p))) {
    return msg
      .replace(/ueber/g, "über")
      .replace(/vollstaendige/g, "vollständige")
      .replace(/fuer/g, "für")
      .replace(/geaendert/g, "geändert");
  }
  if (error?.code === "23505") return "Eintrag bereits vorhanden.";
  // Benannte Table-CHECKs auf ad_advertisers → spezifische Meldung.
  if (msg.includes("ad_advertisers_address_complete")) {
    return "Rechnungsadresse unvollständig: entweder Strasse + Nr. + PLZ + Ort oder Postfach + PLZ + Ort ausfüllen (oder Adresse ganz leer lassen).";
  }
  if (msg.includes("ad_advertisers_language_chk")) return "Sprache muss de, fr, it oder en sein.";
  if (msg.includes("ad_advertisers_uid_format")) return "UID ungültig — Format CHE123456789.";
  if (msg.includes("_len")) return "Ein Feld überschreitet die zulässige Länge (QR-Rechnung).";
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
    const built = buildAdvertiserPayload(input);
    if ("error" in built) return { ok: false, error: built.error };
    const { data, error } = await supabase
      .from("ad_advertisers")
      .insert(built.data)
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
    if (!input.name.trim()) return { ok: false, error: "Name ist erforderlich." };
    if (input.billing_via_agency_id === id) {
      return { ok: false, error: "Kunde kann nicht über sich selbst abgerechnet werden." };
    }
    const built = buildAdvertiserPayload(input);
    if ("error" in built) return { ok: false, error: built.error };
    const { error } = await supabase
      .from("ad_advertisers")
      .update(built.data)
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
    if (!isValidWeight(input.weight)) return { ok: false, error: "Gewicht muss eine ganze Zahl von 1 bis 10 sein." };
    const price = parsePrice(input.price_chf);
    if (!price.ok) return { ok: false, error: "Preis ungültig." };
    const { data, error } = await supabase
      .from("ad_campaigns")
      .insert({
        name: input.name.trim(),
        is_house: input.is_house,
        advertiser_id: input.is_house ? null : input.advertiser_id ?? null,
        price_chf: input.is_house ? null : price.value,
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

// is_house ist nach dem Anlegen unveraenderlich (E2): wird hier nicht mehr
// geschrieben; Kunde/Preis richten sich nach dem gespeicherten Wert. Der
// DB-Trigger enforce_ad_campaign_house_immutable ist das Netz.
export async function updateCampaign(id: string, input: CampaignInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    if (!input.name.trim()) return { ok: false, error: "Name ist erforderlich." };
    if (!isValidWeight(input.weight)) return { ok: false, error: "Gewicht muss eine ganze Zahl von 1 bis 10 sein." };
    const price = parsePrice(input.price_chf);
    if (!price.ok) return { ok: false, error: "Preis ungültig." };
    const { data: current } = await supabase
      .from("ad_campaigns")
      .select("is_house")
      .eq("id", id)
      .maybeSingle();
    if (!current) return { ok: false, error: "Kampagne nicht gefunden." };
    const isHouse = current.is_house;
    if (!isHouse && !input.advertiser_id) {
      return { ok: false, error: "Kunden-Kampagne braucht einen Kunden." };
    }
    const { error } = await supabase
      .from("ad_campaigns")
      .update({
        name: input.name.trim(),
        advertiser_id: isHouse ? null : input.advertiser_id ?? null,
        price_chf: isHouse ? null : price.value,
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

    // Zeitraum (E1): rohe YYYY-MM-DD-Strings; Postgres rechnet Europe/Zurich
    // inkl. Sommer-/Winterzeit. Obergrenze exklusiv 24:00 des Enddatums.
    const from = (input.from ?? "").trim();
    const to = (input.to ?? "").trim();
    if (!from) return { ok: false, error: "Startdatum ist erforderlich." };
    if (!DATE_RE.test(from)) return { ok: false, error: "Startdatum ungültig (YYYY-MM-DD)." };
    if (to && !DATE_RE.test(to)) return { ok: false, error: "Enddatum ungültig (YYYY-MM-DD)." };
    if (to && to < from) return { ok: false, error: "Enddatum liegt vor dem Startdatum." };
    const period = to
      ? `[${from} 00:00 Europe/Zurich,${to} 24:00 Europe/Zurich)`
      : `[${from} 00:00 Europe/Zurich,)`;

    // Platzierung + Kampagne laden (E5/E6: erlaubte Scopes, Verkaeuflichkeit).
    const { data: placement } = await supabase
      .from("ad_placements")
      .select("code, label, is_sellable")
      .eq("id", input.placement_id)
      .maybeSingle();
    if (!placement) return { ok: false, error: "Platzierung nicht gefunden." };
    const { data: campaign } = await supabase
      .from("ad_campaigns")
      .select("is_house")
      .eq("id", input.campaign_id)
      .maybeSingle();
    if (!campaign) return { ok: false, error: "Kampagne nicht gefunden." };

    if (!placement.is_sellable && !campaign.is_house) {
      return { ok: false, error: "Diese Platzierung ist nur für House-Kampagnen buchbar." };
    }
    if (!isPlacementCode(placement.code)) {
      return { ok: false, error: `Platzierung „${placement.code}" ist im Code nicht konfiguriert.` };
    }
    const geo = PLACEMENTS[placement.code];
    if (!geo.allowedScopes.includes(input.scope)) {
      return { ok: false, error: `Geltungsbereich ${input.scope} wird auf ${placement.label} nie ausgeliefert.` };
    }

    const scopeRef = input.scope === "global" ? null : (input.scope_ref ?? "").trim();
    if (input.scope !== "global" && !scopeRef) {
      return { ok: false, error: "Scope-Referenz (Ressort/Artikel) ist erforderlich." };
    }
    if (input.scope === "ressort") {
      if (!RESSORT_SLUGS.some((r) => r.slug === scopeRef)) {
        return { ok: false, error: `Unbekanntes Ressort „${scopeRef}".` };
      }
      if (geo.allowedRessorts && !geo.allowedRessorts.includes(scopeRef!)) {
        return { ok: false, error: `Ressort „${scopeRef}" wird auf ${placement.label} nie ausgeliefert.` };
      }
    }
    if (input.scope === "article") {
      const { data: art } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", scopeRef!)
        .maybeSingle();
      if (!art) return { ok: false, error: `Artikel-Slug „${scopeRef}" nicht gefunden.` };
    }

    const { error } = await supabase.from("ad_bookings").insert({
      campaign_id: input.campaign_id,
      placement_id: input.placement_id,
      scope: input.scope,
      scope_ref: scopeRef,
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
    const url = input.target_url.trim();
    if (!input.headline.trim()) return { ok: false, error: "Headline ist erforderlich." };
    if (!url) return { ok: false, error: "Ziel-URL ist erforderlich." };
    if (!isValidTargetUrl(url)) return { ok: false, error: "Ziel-URL muss mit /, http:// oder https:// beginnen." };
    const { error } = await supabase.from("ad_creatives").insert({
      campaign_id: input.campaign_id,
      kind: "internal",
      variant: input.variant,
      headline: input.headline.trim(),
      body: input.body || null,
      cta_label: input.cta_label || null,
      target_url: url,
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
    const url = input.target_url.trim();
    if (!input.headline.trim()) return { ok: false, error: "Headline ist erforderlich." };
    if (!url) return { ok: false, error: "Ziel-URL ist erforderlich." };
    if (!isValidTargetUrl(url)) return { ok: false, error: "Ziel-URL muss mit /, http:// oder https:// beginnen." };
    const { error } = await supabase
      .from("ad_creatives")
      .update({
        variant: input.variant,
        headline: input.headline.trim(),
        body: input.body || null,
        cta_label: input.cta_label || null,
        target_url: url,
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
