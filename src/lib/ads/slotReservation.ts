import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { PLACEMENTS, matchingExpectedSize, type PlacementCode } from "@/lib/ads/placements";
import { isBookingActive, parsePeriod } from "@/lib/ads/types";

// G3: Die Seite entscheidet serverseitig, was ein Slot reserviert. Service-
// Client ohne cookies() => cache-neutral in ISR-Seiten (Diagnose B8). Keine
// Kundendaten in der Rueckgabe.
//   "none"       keine aktive Buchung (auch kein House) -> der Slot wird gar
//                nicht gerendert, also auch kein Layout-Shift (Backlog
//                «CLS bei leerer Antwort», Entscheid 09.11.2026).
//   "internal"   Texthoehe (House oder typografische Kundenkreative).
//   "image"      Bildhoehe: live Nicht-House-Kampagne mit aktivem Bild-Kreativ.
//   "image-tall" wie image, aber das Mobile-Motiv ist im alternativen, hoeheren
//                Format (home_billboard 300x250 statt 320x100).
// Bei Fehler (z.B. fehlender Service-Key im lokalen Build) immer "internal".
// Rails bleiben immer Texthoehe.
export type SlotReservation = "none" | "internal" | "image" | "image-tall";

type Row = {
  placement_id: string;
  period: unknown;
  paused_at: string | null;
  archived_at: string | null;
  campaign: {
    status: string;
    is_house: boolean;
    creatives: { kind: string; variant: string; is_active: boolean; placement_id: string | null; width: number | null; height: number | null }[];
  } | null;
};

function nowInPeriod(period: unknown, now: number): boolean {
  const p = parsePeriod(period);
  if (!p) return false;
  const lowerOk = p.lower === null || new Date(p.lower).getTime() <= now;
  const upperOk = p.upper === null || now < new Date(p.upper).getTime();
  return lowerOk && upperOk;
}

export async function getSlotReservation(code: PlacementCode): Promise<SlotReservation> {
  const geo = PLACEMENTS[code];
  if (geo.minViewport) return "internal";
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("ad_bookings")
      .select(
        "placement_id, period, paused_at, archived_at, placement:ad_placements!inner(code), campaign:ad_campaigns!inner(status, is_house, creatives:ad_creatives!ad_creatives_campaign_id_fkey(kind, variant, is_active, placement_id, width, height))",
      )
      .filter("placement.code", "eq", code)
      .filter("campaign.status", "eq", "live");
    if (error) console.error("[module] slot reservation query failed:", error.message);
    if (error || !data) return "internal";
    const now = Date.now();
    let anyActive = false;
    let image = false;
    let tall = false;
    const primaryMobile = geo.imageSize.mobile?.[0] ?? null;
    for (const b of data as unknown as Row[]) {
      if (!b.campaign || b.campaign.status !== "live") continue;
      if (!isBookingActive(b) || !nowInPeriod(b.period, now)) continue;
      anyActive = true;
      if (b.campaign.is_house) continue;
      for (const c of b.campaign.creatives ?? []) {
        if (c.kind !== "image" || !c.is_active) continue;
        if (!(c.placement_id === null || c.placement_id === b.placement_id)) continue;
        image = true;
        // Alternatives Mobile-Format: passt das Motiv zu einem anderen als dem Katalogformat?
        if (c.variant === "mobile" && geo.imageHeightMobileAlt && primaryMobile && c.width && c.height) {
          const m = matchingExpectedSize(code, "mobile", c.width, c.height);
          if (m && (m.w !== primaryMobile.w || m.h !== primaryMobile.h)) tall = true;
        }
      }
    }
    if (!anyActive) return "none";
    if (tall) return "image-tall";
    return image ? "image" : "internal";
  } catch {
    return "internal";
  }
}
