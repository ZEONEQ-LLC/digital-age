import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  formatPeriod,
  parsePeriod,
  type AdvertiserWithContacts,
  type BookingShare,
  type CampaignDetail,
  type CampaignOverviewVM,
  type CampaignRow,
  type ContactRow,
  type PlacementRow,
} from "@/lib/ads/types";

// Admin-Lesepfade. Editor-only durch RLS (ad_*_editor_all) gegatet; die
// Admin-Seiten liegen zusaetzlich hinter dem (suite)/admin-Layout-Gate.

type OverviewQueryRow = CampaignRow & {
  advertiser: { name: string } | null;
  bookings: { period: string; placement: { label: string } | null }[];
};

export async function getCampaignsOverview(): Promise<CampaignOverviewVM[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*, advertiser:ad_advertisers(name), bookings:ad_bookings(period, placement:ad_placements(label))")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as OverviewQueryRow[]).map((c) => {
    const labels = Array.from(
      new Set(c.bookings.map((b) => b.placement?.label).filter((l): l is string => !!l)),
    );
    const firstPeriod = c.bookings[0]?.period;
    return {
      id: c.id,
      name: c.name,
      advertiserName: c.advertiser?.name ?? null,
      isHouse: c.is_house,
      status: c.status,
      priceChf: c.price_chf,
      placementLabels: labels,
      periodLabel: firstPeriod ? formatPeriod(firstPeriod) : "—",
    };
  });
}

// ── Anteil an der Rotation (F1) ──────────────────────────────────────────
type Bound = { lower: number; upper: number };

function toBound(period: unknown): Bound | null {
  const p = parsePeriod(period);
  if (!p) return null;
  const lower = p.lower ? new Date(p.lower).getTime() : Number.NEGATIVE_INFINITY;
  const upper = p.upper ? new Date(p.upper).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isNaN(lower) || Number.isNaN(upper)) return null;
  return { lower, upper };
}

function overlaps(a: Bound, b: Bound): boolean {
  return a.lower < b.upper && b.lower < a.upper;
}

type ShareCandidateRow = {
  id: string;
  campaign_id: string;
  placement_id: string;
  scope: string;
  scope_ref: string | null;
  period: unknown;
  campaign: { id: string; status: string; is_house: boolean; weight: number } | null;
};

// Rechnet fuer jede Buchung der Kampagne den Anteil aus, den sie HAETTE, wenn
// die Kampagne jetzt live waere: eigenes Gewicht / Summe der Gewichte aller
// Live-Kampagnen auf derselben Flaeche und Spezifitaetsebene (gleicher scope +
// scope_ref), ueberlappender Zeitraum, jetzt innerhalb ihrer period. Pro
// Kampagne nur einmal (Gewicht der Kampagne, nicht pro Buchung).
// Nicht-House schlaegt House — wie route.ts.
function computeShares(
  own: { id: string; placement_id: string; scope: string; scope_ref: string | null; period: unknown }[],
  ownCampaignId: string,
  ownIsHouse: boolean,
  ownWeight: number,
  all: ShareCandidateRow[],
): Map<string, BookingShare> {
  const now = Date.now();
  const out = new Map<string, BookingShare>();
  for (const b of own) {
    const bb = toBound(b.period);
    const ref = b.scope_ref ?? "";
    const byCampaign = new Map<string, { isHouse: boolean; weight: number }>();
    if (bb) {
      for (const c of all) {
        if (!c.campaign || c.campaign.id === ownCampaignId) continue;
        if (c.campaign.status !== "live") continue;
        if (c.placement_id !== b.placement_id || c.scope !== b.scope || (c.scope_ref ?? "") !== ref) continue;
        const cb = toBound(c.period);
        if (!cb || !overlaps(bb, cb)) continue;
        if (!(cb.lower <= now && now < cb.upper)) continue;
        if (!byCampaign.has(c.campaign.id)) byCampaign.set(c.campaign.id, { isHouse: c.campaign.is_house, weight: Math.max(1, c.campaign.weight) });
      }
    }
    const cands = Array.from(byCampaign.values());
    const customers = cands.filter((c) => !c.isHouse);
    const houses = cands.filter((c) => c.isHouse);
    const w = Math.max(1, ownWeight);
    if (ownIsHouse && customers.length > 0) {
      out.set(b.id, { sharePct: 0, othersCount: customers.length, reason: "Kundenkampagne live" });
      continue;
    }
    const others = ownIsHouse ? houses : customers;
    const sum = others.reduce((s, c) => s + c.weight, 0);
    out.set(b.id, { sharePct: Math.round((w / (w + sum)) * 100), othersCount: others.length });
  }
  return out;
}

export async function getCampaignDetail(id: string): Promise<CampaignDetail | null> {
  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("ad_campaigns")
    .select("*, advertiser:ad_advertisers(name)")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) return null;
  const campaignRow = campaign as unknown as CampaignRow;
  const advertiserName =
    (campaign as unknown as { advertiser: { name: string } | null }).advertiser?.name ?? null;

  const { data: bookings } = await supabase
    .from("ad_bookings")
    .select("*, placement:ad_placements(label, code)")
    .eq("campaign_id", id)
    .order("created_at", { ascending: true });

  const { data: creatives } = await supabase
    .from("ad_creatives")
    .select("*")
    .eq("campaign_id", id)
    .order("created_at", { ascending: true });

  type BookingQueryRow = Omit<CampaignDetail["bookings"][number], "share"> & {
    placement: { label: string; code: string } | null;
  };
  const ownBookings = ((bookings ?? []) as unknown as BookingQueryRow[]);

  // Eine Query fuer alle Buchungen der betroffenen Platzierungen (kein N+1).
  const placementIds = Array.from(new Set(ownBookings.map((b) => b.placement_id)));
  let all: ShareCandidateRow[] = [];
  if (placementIds.length > 0) {
    const { data: cand } = await supabase
      .from("ad_bookings")
      .select("id, campaign_id, placement_id, scope, scope_ref, period, campaign:ad_campaigns(id, status, is_house, weight)")
      .in("placement_id", placementIds);
    all = (cand ?? []) as unknown as ShareCandidateRow[];
  }
  const shares = computeShares(ownBookings, campaignRow.id, campaignRow.is_house, campaignRow.weight, all);

  return {
    campaign: campaignRow,
    advertiserName,
    bookings: ownBookings.map((b) => ({
      ...b,
      placementLabel: b.placement?.label ?? b.placement_id,
      placementCode: b.placement?.code ?? "",
      share: shares.get(b.id) ?? { sharePct: 100, othersCount: 0 },
    })),
    creatives: creatives ?? [],
  };
}

export async function getAdvertisersWithContacts(): Promise<AdvertiserWithContacts[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ad_advertisers")
    .select("*, contacts:ad_contacts(*)")
    .order("name", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as AdvertiserWithContacts[]).map((a) => ({
    ...a,
    contacts: (a.contacts ?? []) as ContactRow[],
  }));
}

export async function getAdvertisersLight(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ad_advertisers")
    .select("id, name")
    .order("name", { ascending: true });
  return (data ?? []) as { id: string; name: string }[];
}

export async function getPlacements(): Promise<PlacementRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ad_placements")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data ?? []) as PlacementRow[];
}
