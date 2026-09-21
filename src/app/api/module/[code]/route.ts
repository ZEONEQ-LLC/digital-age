import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parsePeriod } from "@/lib/ads/types";

// Oeffentliche Auslieferung eines Platzierungs-Moduls. force-dynamic +
// Service-Role (RLS-Bypass): Kundendaten/Preise/Laufzeiten sind ueber den
// anon-Key nie erreichbar. Antwort ist immer JSON, nie HTML, no-store.
// Neutrale Benennung (kein ad/banner/... im Pfad) — Adblocker-tolerant.
export const dynamic = "force-dynamic";

type CreativeCand = {
  kind: string;
  variant: string;
  headline: string | null;
  body: string | null;
  cta_label: string | null;
  target_url: string;
  is_active: boolean;
};

type BookingCand = {
  scope: string;
  scope_ref: string | null;
  period: string;
  campaign: {
    id: string;
    weight: number;
    is_house: boolean;
    status: string;
    creatives: CreativeCand[];
  } | null;
};

function nowInPeriod(period: string, now: number): boolean {
  const parsed = parsePeriod(period);
  if (!parsed) return false;
  const lowerOk = parsed.lower === null || new Date(parsed.lower).getTime() <= now;
  const upperOk = parsed.upper === null || now < new Date(parsed.upper).getTime();
  return lowerOk && upperOk;
}

const EMPTY = () =>
  NextResponse.json({}, { status: 200, headers: { "Cache-Control": "no-store" } });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const url = new URL(request.url);
  const v = parseInt(url.searchParams.get("v") ?? "0", 10) || 0;
  const a = url.searchParams.get("a");        // Artikel-Slug
  const r = url.searchParams.get("r");        // Ressort-Slug

  const supabase = createServiceClient();

  // 1. Platzierung laden.
  const { data: placement } = await supabase
    .from("ad_placements")
    .select("id, min_viewport")
    .eq("code", code)
    .maybeSingle();
  if (!placement) return EMPTY();

  // Mindestbreite unterschritten -> nichts ausliefern.
  if (placement.min_viewport != null && v < placement.min_viewport) return EMPTY();

  const variant = v > 0 && v < 768 ? "mobile" : "desktop";

  // 2. Kandidaten: live-Kampagnen, Kreativ aktiv + Variante passend.
  const { data, error } = await supabase
    .from("ad_bookings")
    .select(
      "scope, scope_ref, period, campaign:ad_campaigns(id, weight, is_house, status, creatives:ad_creatives(kind, variant, headline, body, cta_label, target_url, is_active))",
    )
    .eq("placement_id", placement.id);
  if (error || !data) return EMPTY();

  const now = Date.now();
  type Cand = { weight: number; isHouse: boolean; scope: string; scopeRef: string | null; creative: CreativeCand };
  const cands: Cand[] = [];
  for (const b of data as unknown as BookingCand[]) {
    if (!b.campaign) continue;
    if (b.campaign.status !== "live") continue;
    if (!nowInPeriod(b.period, now)) continue;
    const creative = (b.campaign.creatives ?? []).find(
      (c) => c.is_active && c.variant === variant && c.kind === "internal",
    );
    if (!creative) continue;
    cands.push({
      weight: b.campaign.weight,
      isHouse: b.campaign.is_house,
      scope: b.scope,
      scopeRef: b.scope_ref,
      creative,
    });
  }
  if (cands.length === 0) return EMPTY();

  // 3. Spezifitaet: article > ressort > global. Erste nicht-leere Ebene gewinnt.
  let level: Cand[] = [];
  if (a) level = cands.filter((c) => c.scope === "article" && c.scopeRef === a);
  if (level.length === 0 && r) level = cands.filter((c) => c.scope === "ressort" && c.scopeRef === r);
  if (level.length === 0) level = cands.filter((c) => c.scope === "global");
  if (level.length === 0) return EMPTY();

  // 4. Nicht-House schlaegt House.
  const nonHouse = level.filter((c) => !c.isHouse);
  const pool = nonHouse.length > 0 ? nonHouse : level;

  // Gewichtet-zufaellig ziehen.
  const total = pool.reduce((sum, c) => sum + Math.max(1, c.weight), 0);
  let roll = Math.random() * total;
  let picked = pool[0];
  for (const c of pool) {
    roll -= Math.max(1, c.weight);
    if (roll < 0) { picked = c; break; }
  }

  // 5. Antwort — keine ids, keine Kundennamen, keine Preise.
  return NextResponse.json(
    {
      kind: picked.creative.kind,
      headline: picked.creative.headline,
      body: picked.creative.body,
      ctaLabel: picked.creative.cta_label,
      href: picked.creative.target_url,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
