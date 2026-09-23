import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { PLACEMENTS, type PlacementCode } from "@/lib/ads/placements";
import { parsePeriod } from "@/lib/ads/types";

// G3: Die Seite entscheidet serverseitig, ob ein Slot Bild- oder Texthoehe
// reserviert. Ein einziges Boolean: "existiert jetzt eine live Nicht-House-
// Kampagne mit aktivem Bild-Kreativ auf dieser Platzierung". Service-Client
// ohne cookies() => cache-neutral in ISR-Seiten (Diagnose B8). Keine
// Kundendaten in der Rueckgabe. Bei Fehler (z.B. fehlender Service-Key im
// lokalen Build) immer "internal". Rails bleiben immer Texthoehe.
export type SlotReservation = "image" | "internal";

type Row = {
  placement_id: string;
  period: unknown;
  campaign: {
    status: string;
    is_house: boolean;
    creatives: { kind: string; is_active: boolean; placement_id: string | null }[];
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
  if (PLACEMENTS[code].minViewport) return "internal";
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("ad_bookings")
      .select(
        "placement_id, period, placement:ad_placements!inner(code), campaign:ad_campaigns!inner(status, is_house, creatives:ad_creatives(kind, is_active, placement_id))",
      )
      .filter("placement.code", "eq", code)
      .filter("campaign.status", "eq", "live")
      .filter("campaign.is_house", "eq", false);
    if (error || !data) return "internal";
    const now = Date.now();
    for (const b of data as unknown as Row[]) {
      if (!b.campaign || b.campaign.status !== "live" || b.campaign.is_house) continue;
      if (!nowInPeriod(b.period, now)) continue;
      const hit = (b.campaign.creatives ?? []).some(
        (c) => c.kind === "image" && c.is_active && (c.placement_id === null || c.placement_id === b.placement_id),
      );
      if (hit) return "image";
    }
    return "internal";
  } catch {
    return "internal";
  }
}
