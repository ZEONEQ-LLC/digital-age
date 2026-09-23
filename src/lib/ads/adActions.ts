"use server";

import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/database.types";
import { createServiceClient } from "@/lib/supabase/service";
import { requireEditor } from "@/lib/ads/editorGate";
import { isModuleImagePath } from "@/lib/ads/imagePath";
import { lookupUid } from "@/lib/ads/uidLookup";
import { getCampaignStatsRows, type CampaignStatsRow } from "@/lib/ads/statsApi";
import {
  RESSORT_SLUGS,
  allowedStatusTargets,
  normalizeUid,
  type ActionResult,
  type ActionResultId,
  type AdvertiserInput,
  type BookingInput,
  type CampaignInput,
  type CampaignStatus,
  type ContactInput,
  type CreativeInput,
  type UidLookupResult,
} from "@/lib/ads/types";
import { PLACEMENTS, isPlacementCode } from "@/lib/ads/placements";
import { isCreativeTheme, isHex } from "@/lib/ads/creativeTheme";

type AdvertiserInsert = Database["public"]["Tables"]["ad_advertisers"]["Insert"];
type CreativeInsert = Database["public"]["Tables"]["ad_creatives"]["Insert"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TOKEN_RE = /^[0-9a-f]{48}$/;

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

// Gestaltung (F3): theme muss bekannt sein; custom braucht gueltiges HEX (klein gespeichert),
// sonst wird bg_color unabhaengig vom Formular auf null gesetzt.
function resolveCreativeStyle(input: { theme?: string; bg_color?: string | null }):
  { error: string } | { theme: string; bg_color: string | null } {
  const theme = input.theme ?? "card";
  if (!isCreativeTheme(theme)) return { error: "Gestaltung ungültig." };
  if (theme === "custom") {
    const bg = (input.bg_color ?? "").trim();
    if (!bg || !isHex(bg)) return { error: "Hintergrundfarbe fehlt oder ist kein gültiger HEX-Wert (#rrggbb)." };
    return { theme, bg_color: bg.toLowerCase() };
  }
  return { theme, bg_color: null };
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

// Trigger-RAISE-Meldungen sind bereits deutsch + user-tauglich → durchreichen.
const PASSTHROUGH_PREFIXES = [
  "Kampagne kann nicht aktiviert",
  "Rechnung ueber Agentur",
  "Kampagnenart",
  "Diese Platzierung ist nur",
  "Kreativ wird von einer laufenden",
  "Kunde hat laufende Kampagnen",
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
      .replace(/geaendert/g, "geändert")
      .replace(/koennen/g, "können");
  }
  if (error?.code === "23P01") {
    return "Diese Buchung existiert bereits: gleiche Platzierung, gleicher Geltungsbereich, überlappender Zeitraum.";
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
    // Statusautomat (H6): nur vorgesehene Uebergaenge; DB-Gates bleiben als Netz.
    const { data: current } = await supabase
      .from("ad_campaigns")
      .select("status, is_house")
      .eq("id", id)
      .maybeSingle();
    if (!current) return { ok: false, error: "Kampagne nicht gefunden." };
    if (current.status === status) return { ok: true };
    if (!allowedStatusTargets(current.is_house, current.status).includes(status)) {
      return { ok: false, error: `Übergang ${current.status} → ${status} ist nicht vorgesehen.` };
    }
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

// ── Creatives (internal + image) ──────────────────────────────────────────
// Baut das DB-Payload (ohne campaign_id). image: placement_id, image_path,
// width/height (serverseitig ermittelt), alt_text Pflicht; Textfelder null,
// theme card. internal: headline Pflicht, placement_id optional.
function buildCreativePayload(
  campaignId: string,
  input: Omit<CreativeInput, "campaign_id">,
): { error: string } | { data: Omit<CreativeInsert, "campaign_id"> } {
  const kind = input.kind ?? "internal";
  const url = (input.target_url ?? "").trim();
  if (!url) return { error: "Ziel-URL ist erforderlich." };
  if (!isValidTargetUrl(url)) return { error: "Ziel-URL muss mit /, http:// oder https:// beginnen." };
  if (input.variant !== "desktop" && input.variant !== "mobile") return { error: "Variante ungültig." };
  const placementId = input.placement_id ? input.placement_id.trim() : null;
  if (placementId && !UUID_RE.test(placementId)) return { error: "Platzierung ungültig." };

  if (kind === "image") {
    if (!placementId) return { error: "Bild-Kreative brauchen eine Platzierung." };
    const path = (input.image_path ?? "").trim();
    if (!path || !isModuleImagePath(path) || !path.startsWith(`${campaignId}/`)) {
      return { error: "Bild fehlt — bitte zuerst hochladen." };
    }
    const w = input.width ?? 0;
    const h = input.height ?? 0;
    if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) return { error: "Bildmasse fehlen." };
    const alt = (input.alt_text ?? "").trim();
    if (!alt) return { error: "Alt-Text ist erforderlich." };
    return {
      data: {
        kind: "image",
        variant: input.variant,
        placement_id: placementId,
        headline: null,
        body: null,
        cta_label: null,
        image_path: path,
        width: w,
        height: h,
        alt_text: alt.slice(0, 200),
        target_url: url,
        is_active: input.is_active ?? true,
        theme: "card",
        bg_color: null,
      },
    };
  }

  const headline = (input.headline ?? "").trim();
  if (!headline) return { error: "Headline ist erforderlich." };
  const style = resolveCreativeStyle(input);
  if ("error" in style) return { error: style.error };
  return {
    data: {
      kind: "internal",
      variant: input.variant,
      placement_id: placementId,
      headline,
      body: input.body || null,
      cta_label: input.cta_label || null,
      image_path: null,
      width: null,
      height: null,
      alt_text: null,
      target_url: url,
      is_active: input.is_active ?? true,
      theme: style.theme,
      bg_color: style.bg_color,
    },
  };
}

// Best-Effort-Loeschung einer Bilddatei im Bucket "modules" (Fehler geschluckt —
// die Zeile ist wichtiger als der Cleanup).
async function removeModuleImage(
  supabase: Awaited<ReturnType<typeof requireEditor>>["supabase"],
  path: string | null | undefined,
): Promise<void> {
  if (!path || !isModuleImagePath(path)) return;
  try {
    await supabase.storage.from("modules").remove([path]);
  } catch {
    // ignore
  }
}

export async function createCreative(input: CreativeInput): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    if (!UUID_RE.test(input.campaign_id)) return { ok: false, error: "Kampagne ungültig." };
    const built = buildCreativePayload(input.campaign_id, input);
    if ("error" in built) return { ok: false, error: built.error };
    const { error } = await supabase
      .from("ad_creatives")
      .insert({ campaign_id: input.campaign_id, ...built.data });
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
    const { data: current } = await supabase
      .from("ad_creatives")
      .select("id, campaign_id, image_path, kind, variant")
      .eq("id", id)
      .maybeSingle();
    if (!current || current.campaign_id !== campaignId) return { ok: false, error: "Kreativ nicht gefunden." };
    // H2: Variante eines gespeicherten Bild-Kreativs ist nicht aenderbar.
    if (current.kind === "image" && input.variant !== current.variant) {
      return { ok: false, error: "Variante eines Bild-Kreativs kann nicht geändert werden. Motiv ersetzen oder neues Kreativ anlegen." };
    }
    const built = buildCreativePayload(campaignId, input);
    if ("error" in built) return { ok: false, error: built.error };
    const { error } = await supabase.from("ad_creatives").update(built.data).eq("id", id);
    if (error) return { ok: false, error: mapDbError(error) };
    // Bild ersetzt oder Wechsel image -> internal: alte Datei entfernen.
    if (current.image_path && current.image_path !== built.data.image_path) {
      await removeModuleImage(supabase, current.image_path);
    }
    revalidateAll(campaignId);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteCreative(id: string, campaignId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    const { data: current } = await supabase
      .from("ad_creatives")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();
    if (current?.image_path) await removeModuleImage(supabase, current.image_path);
    const { error } = await supabase.from("ad_creatives").delete().eq("id", id);
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll(campaignId);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Bild-Kreative als Desktop/Mobile-Paar (H1) ───────────────────────────
// Datenmodell bleibt: eine Zeile pro Variante. Die Paarung passiert hier und
// im Formular. Desktop Pflicht; Mobile nur, wenn die Platzierung mobile_size
// hat (sonst wird ein vorhandenes Mobile-Kreativ inkl. Datei entfernt).
// Fehlendes Mobile blockiert das Speichern nicht — die Luecke wird im Admin
// proaktiv angezeigt (H3) und vom Aktivierungs-Gate abgefangen.
export type ImageCreativeFile = { image_path: string; width: number; height: number };

export type ImageCreativePairInput = {
  placement_id: string;
  target_url: string;
  alt_text: string;
  is_active: boolean;
  desktop: ImageCreativeFile;
  mobile?: ImageCreativeFile | null;
  existingDesktopId?: string | null;
  existingMobileId?: string | null;
};

export async function saveImageCreativePair(
  campaignId: string,
  input: ImageCreativePairInput,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    if (!UUID_RE.test(campaignId)) return { ok: false, error: "Kampagne ungültig." };
    if (!UUID_RE.test(input.placement_id ?? "")) return { ok: false, error: "Bild-Kreative brauchen eine Platzierung." };
    const { data: placement } = await supabase
      .from("ad_placements")
      .select("id, label, mobile_size")
      .eq("id", input.placement_id)
      .maybeSingle();
    if (!placement) return { ok: false, error: "Platzierung nicht gefunden." };
    const needsMobile = placement.mobile_size !== null;
    if (!needsMobile && input.mobile) {
      return { ok: false, error: `${placement.label} liefert nicht mobil aus — kein Mobile-Motiv möglich.` };
    }

    const common = {
      kind: "image" as const,
      placement_id: input.placement_id,
      target_url: input.target_url,
      alt_text: input.alt_text,
      is_active: input.is_active,
    };

    // Vorhandene Zeilen der Platzierung laden (fuer Datei-Cleanup + Variante).
    const ids = [input.existingDesktopId, input.existingMobileId].filter((x): x is string => !!x && UUID_RE.test(x));
    const { data: existing } = ids.length
      ? await supabase.from("ad_creatives").select("id, campaign_id, kind, variant, image_path").in("id", ids)
      : { data: [] as { id: string; campaign_id: string; kind: string; variant: string; image_path: string | null }[] };
    const byId = new Map((existing ?? []).map((r) => [r.id, r]));

    async function writeOne(
      variant: "desktop" | "mobile",
      file: ImageCreativeFile,
      existingId: string | null | undefined,
    ): Promise<string | null> {
      const built = buildCreativePayload(campaignId, { ...common, variant, image_path: file.image_path, width: file.width, height: file.height });
      if ("error" in built) return built.error;
      const cur = existingId ? byId.get(existingId) : undefined;
      if (existingId && (!cur || cur.campaign_id !== campaignId || cur.kind !== "image" || cur.variant !== variant)) {
        return "Bestehendes Kreativ passt nicht zu Kampagne oder Variante.";
      }
      if (cur) {
        const { error } = await supabase.from("ad_creatives").update(built.data).eq("id", cur.id);
        if (error) return mapDbError(error);
        if (cur.image_path && cur.image_path !== file.image_path) await removeModuleImage(supabase, cur.image_path);
      } else {
        const { error } = await supabase.from("ad_creatives").insert({ campaign_id: campaignId, ...built.data });
        if (error) return mapDbError(error);
      }
      return null;
    }

    // Reihenfolge: erst Desktop, dann Mobile.
    const dErr = await writeOne("desktop", input.desktop, input.existingDesktopId);
    if (dErr) return { ok: false, error: dErr };

    if (input.mobile) {
      const mErr = await writeOne("mobile", input.mobile, input.existingMobileId);
      if (mErr) { revalidateAll(campaignId); return { ok: false, error: `Desktop gespeichert, Mobile nicht: ${mErr}` }; }
    } else if (input.existingMobileId) {
      // Platzierung ohne Mobile oder Mobile im Formular entfernt: Zeile + Datei weg.
      const cur = byId.get(input.existingMobileId);
      if (cur && cur.campaign_id === campaignId) {
        if (cur.image_path) await removeModuleImage(supabase, cur.image_path);
        const { error } = await supabase.from("ad_creatives").delete().eq("id", cur.id);
        if (error) { revalidateAll(campaignId); return { ok: false, error: `Desktop gespeichert, Mobile nicht: ${mapDbError(error)}` }; }
      }
    }
    revalidateAll(campaignId);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// Loescht beide Zeilen (kind='image') einer Platzierung inkl. Dateien.
export async function deleteImageCreativePair(campaignId: string, placementId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    const { data: rows } = await supabase
      .from("ad_creatives")
      .select("id, image_path")
      .eq("campaign_id", campaignId)
      .eq("placement_id", placementId)
      .eq("kind", "image");
    for (const r of rows ?? []) {
      if (r.image_path) await removeModuleImage(supabase, r.image_path);
    }
    const { error } = await supabase
      .from("ad_creatives")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("placement_id", placementId)
      .eq("kind", "image");
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll(campaignId);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ── Vorschau-Link + Freigabe (G5) ─────────────────────────────────────────
// Neues Token aus der DB (RPC, gen_random_bytes). Der alte Link wird ungueltig.
export async function regeneratePreviewToken(campaignId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireEditor();
    const { error } = await supabase.rpc("regenerate_ad_preview_token", { p_campaign_id: campaignId });
    if (error) return { ok: false, error: mapDbError(error) };
    revalidateAll(campaignId);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// OEFFENTLICHER Pfad (kein requireEditor): der Kunde gibt ueber /vorschau/<token>
// frei. Service-Client, Lookup per Token, idempotent (nur wenn approved_at null).
// Kein Hinweis, ob ein Token existiert: immer dieselbe Fehlermeldung.
const APPROVE_GENERIC = "Freigabe nicht möglich. Bitte den Link aus der E-Mail erneut öffnen.";

export async function approveCampaignByToken(
  token: string,
  name: string,
  note?: string | null,
): Promise<ActionResult> {
  try {
    const t = (token ?? "").trim();
    const n = (name ?? "").trim();
    const memo = (note ?? "").trim();
    if (!n) return { ok: false, error: "Bitte Ihren Namen angeben." };
    if (n.length > 120) return { ok: false, error: "Name ist zu lang (max. 120 Zeichen)." };
    if (memo.length > 1000) return { ok: false, error: "Bemerkung ist zu lang (max. 1000 Zeichen)." };
    if (!TOKEN_RE.test(t)) return { ok: false, error: APPROVE_GENERIC };

    const supabase = createServiceClient();
    const { data: campaign } = await supabase
      .from("ad_campaigns")
      .select("id, approved_at, status")
      .eq("preview_token", t)
      .maybeSingle();
    if (!campaign) return { ok: false, error: APPROVE_GENERIC };
    if (campaign.approved_at) return { ok: true };
    // Nach dem Livegang hat eine Freigabe keinen Zweck mehr (alter Tab).
    if (["live", "paused", "ended"].includes(campaign.status)) {
      return { ok: false, error: "Die Kampagne läuft bereits." };
    }

    const { error } = await supabase
      .from("ad_campaigns")
      .update({ approved_at: new Date().toISOString(), approved_by: n, approved_note: memo || null })
      .eq("id", campaign.id)
      .is("approved_at", null);
    if (error) return { ok: false, error: APPROVE_GENERIC };
    revalidatePath(`/vorschau/${t}`);
    revalidateAll(campaign.id);
    return { ok: true };
  } catch {
    return { ok: false, error: APPROVE_GENERIC };
  }
}

// ── UID-Register (G6) ─────────────────────────────────────────────────────
export async function lookupUidAction(query: string): Promise<UidLookupResult> {
  try {
    await requireEditor();
    return await lookupUid(query);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Report (J6): flache Zeilen fuer den CSV-Export im Admin ───────────────
export async function exportCampaignStatsRows(
  campaignId: string,
): Promise<{ ok: true; rows: CampaignStatsRow[] } | { ok: false; error: string }> {
  try {
    const { supabase } = await requireEditor();
    if (!UUID_RE.test(campaignId)) return { ok: false, error: "Kampagne ungültig." };
    const rows = await getCampaignStatsRows(supabase, campaignId);
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
