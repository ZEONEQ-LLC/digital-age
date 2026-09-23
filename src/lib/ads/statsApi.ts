import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parsePeriod } from "@/lib/ads/types";

// Lesepfade fuer den Kundenreport (J6). Der Client wird uebergeben: SSR-Client
// im Admin (RLS: Editor liest), Service-Client auf /vorschau/[token].
type Sb = SupabaseClient<Database>;

export type PlacementStats = {
  placementId: string;
  label: string;
  impressions: number;
  clicks: number;
  ctr: number | null; // Prozent, null bei 0 Impressionen
};

export type CampaignStats = {
  impressions: number;
  clicks: number;
  ctr: number | null;
  byPlacement: PlacementStats[];
  series: { day: string; impressions: number; clicks: number }[]; // letzte N Tage, YYYY-MM-DD (Zuerich), lueckenlos
  periodFrom: string | null;  // ISO
  periodTo: string | null;    // ISO, null = offen
  daysElapsed: number;        // Laufzeit-Tage bisher (Zuercher Tage, min 0)
  daysTotal: number | null;   // null = offen
};

export type CampaignStatsRow = {
  day: string;
  placement_label: string;
  creative_label: string;
  variant: string;
  impressions: number;
  clicks: number;
};

const ZURICH_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit",
});

export function zurichDay(d: Date = new Date()): string {
  return ZURICH_DAY.format(d); // YYYY-MM-DD
}

function shiftDay(day: string, deltaDays: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);
}

export function ctrOf(impressions: number, clicks: number): number | null {
  return impressions > 0 ? (clicks / impressions) * 100 : null;
}

type StatRow = {
  placement_id: string;
  day: string;
  impressions: number;
  clicks: number;
  placement: { label: string } | null;
};

export async function getCampaignStats(supabase: Sb, campaignId: string, days = 30): Promise<CampaignStats> {
  const [{ data: rows }, { data: bookings }] = await Promise.all([
    supabase
      .from("ad_stats_daily")
      .select("placement_id, day, impressions, clicks, placement:ad_placements(label)")
      .eq("campaign_id", campaignId),
    supabase.from("ad_bookings").select("period").eq("campaign_id", campaignId),
  ]);
  const stats = (rows ?? []) as unknown as StatRow[];

  let impressions = 0;
  let clicks = 0;
  const byPl = new Map<string, PlacementStats>();
  const byDay = new Map<string, { impressions: number; clicks: number }>();
  for (const r of stats) {
    impressions += r.impressions;
    clicks += r.clicks;
    const pl = byPl.get(r.placement_id) ?? { placementId: r.placement_id, label: r.placement?.label ?? "?", impressions: 0, clicks: 0, ctr: null };
    pl.impressions += r.impressions;
    pl.clicks += r.clicks;
    byPl.set(r.placement_id, pl);
    const d = byDay.get(r.day) ?? { impressions: 0, clicks: 0 };
    d.impressions += r.impressions;
    d.clicks += r.clicks;
    byDay.set(r.day, d);
  }
  const byPlacement = Array.from(byPl.values())
    .map((p) => ({ ...p, ctr: ctrOf(p.impressions, p.clicks) }))
    .sort((a, b) => b.impressions - a.impressions);

  const today = zurichDay();
  const series: CampaignStats["series"] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = shiftDay(today, -i);
    const d = byDay.get(day);
    series.push({ day, impressions: d?.impressions ?? 0, clicks: d?.clicks ?? 0 });
  }

  // Zeitraum: min lower / max upper der Buchungen; eine offene Obergrenze macht das Ganze offen.
  let from: number | null = null;
  let to: number | null = null;
  let open = false;
  for (const b of bookings ?? []) {
    const p = parsePeriod((b as { period: unknown }).period);
    if (!p) continue;
    if (p.lower) { const t = new Date(p.lower).getTime(); if (from === null || t < from) from = t; }
    if (p.upper) { const t = new Date(p.upper).getTime(); if (to === null || t > to) to = t; } else { open = true; }
  }
  const periodFrom = from !== null ? new Date(from).toISOString() : null;
  const periodTo = !open && to !== null ? new Date(to).toISOString() : null;
  let daysElapsed = 0;
  let daysTotal: number | null = null;
  if (from !== null) {
    const startDay = zurichDay(new Date(from));
    const endNow = periodTo && new Date(periodTo).getTime() < Date.now() ? zurichDay(new Date(new Date(periodTo).getTime() - 1)) : today;
    daysElapsed = Math.max(0, dayDiff(startDay, endNow) + 1);
    if (periodTo) daysTotal = Math.max(0, dayDiff(startDay, zurichDay(new Date(new Date(periodTo).getTime() - 1))) + 1);
  }

  return { impressions, clicks, ctr: ctrOf(impressions, clicks), byPlacement, series, periodFrom, periodTo, daysElapsed, daysTotal };
}

type RowsQuery = {
  day: string;
  impressions: number;
  clicks: number;
  placement: { label: string } | null;
  creative: { kind: string; variant: string; headline: string | null; width: number | null; height: number | null } | null;
};

export async function getCampaignStatsRows(supabase: Sb, campaignId: string): Promise<CampaignStatsRow[]> {
  const { data } = await supabase
    .from("ad_stats_daily")
    .select("day, impressions, clicks, placement:ad_placements(label), creative:ad_creatives(kind, variant, headline, width, height)")
    .eq("campaign_id", campaignId)
    .order("day", { ascending: true });
  return ((data ?? []) as unknown as RowsQuery[]).map((r) => ({
    day: r.day,
    placement_label: r.placement?.label ?? "?",
    creative_label: r.creative
      ? r.creative.kind === "image" ? `Bild ${r.creative.width ?? "?"}x${r.creative.height ?? "?"}` : (r.creative.headline ?? "")
      : "?",
    variant: r.creative?.variant ?? "",
    impressions: r.impressions,
    clicks: r.clicks,
  }));
}
