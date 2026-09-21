import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  formatPeriod,
  type AdvertiserWithContacts,
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

export async function getCampaignDetail(id: string): Promise<CampaignDetail | null> {
  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("ad_campaigns")
    .select("*, advertiser:ad_advertisers(name)")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) return null;
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

  type BookingQueryRow = CampaignDetail["bookings"][number] & {
    placement: { label: string; code: string } | null;
  };

  return {
    campaign: campaign as unknown as CampaignRow,
    advertiserName,
    bookings: ((bookings ?? []) as unknown as BookingQueryRow[]).map((b) => ({
      ...b,
      placementLabel: b.placement?.label ?? b.placement_id,
      placementCode: b.placement?.code ?? "",
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
