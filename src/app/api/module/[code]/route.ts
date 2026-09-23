import { NextResponse } from "next/server";
import { isbot } from "isbot";
import { createServiceClient } from "@/lib/supabase/service";
import { parsePeriod } from "@/lib/ads/types";
import { signDelivery, verifyDelivery } from "@/lib/ads/deliveryToken";

// Oeffentliche Auslieferung eines Platzierungs-Moduls. force-dynamic +
// Service-Role (RLS-Bypass): Kundendaten/Preise/Laufzeiten sind ueber den
// anon-Key nie erreichbar. Antwort ist immer JSON, nie HTML, no-store.
// Neutrale Benennung (kein ad/banner/... im Pfad) — Adblocker-tolerant.
// Query: v = Viewportbreite, r = Ressort-Slug, a = Artikel-Slug,
//        p = Vorschau-Token (G5: Kampagne an ihren echten Positionen zeigen).
// GET liefert zusaetzlich k = signiertes Auslieferungs-Token (J3); POST nimmt
// { k, t: "v" | "c" } als Ereignis entgegen (J5) und zaehlt ins Tagesaggregat.
export const dynamic = "force-dynamic";

type CreativeCand = {
  id: string;
  kind: string;
  variant: string;
  placement_id: string | null;
  headline: string | null;
  body: string | null;
  cta_label: string | null;
  target_url: string;
  is_active: boolean;
  theme: string;
  bg_color: string | null;
  image_path: string | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
};

const CREATIVE_SELECT =
  "id, kind, variant, placement_id, headline, body, cta_label, target_url, is_active, theme, bg_color, image_path, width, height, alt_text";

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

// parsePeriod normalisiert die PostgREST-Grenzen nach ISO (Safari-sicher).
function nowInPeriod(period: string, now: number): boolean {
  const parsed = parsePeriod(period);
  if (!parsed) return false;
  const lowerOk = parsed.lower === null || new Date(parsed.lower).getTime() <= now;
  const upperOk = parsed.upper === null || now < new Date(parsed.upper).getTime();
  return lowerOk && upperOk;
}

// Kreativ-Auswahl je Kampagne: aktiv + passende Variante; zuerst
// placement_id = diese Platzierung, sonst placement_id null. Kind egal.
function pickCreative(creatives: CreativeCand[], variant: string, placementId: string): CreativeCand | null {
  const active = (creatives ?? []).filter((c) => c.is_active && c.variant === variant);
  return active.find((c) => c.placement_id === placementId) ?? active.find((c) => c.placement_id === null) ?? null;
}

const NO_STORE = { status: 200, headers: { "Cache-Control": "no-store" } };
const EMPTY = () => NextResponse.json({}, NO_STORE);

// Antwort — keine ids, keine Kundennamen, keine Preise. Neutrale Keys.
// k = signiertes Auslieferungs-Token (nur wenn Service-Key vorhanden und kein
// Vorschau-Aufruf); ohne k zaehlt der Client nichts.
function respond(creative: CreativeCand, isHouse: boolean, publicUrl: (path: string) => string, k: string | null) {
  const token = k ? { k } : {};
  if (creative.kind === "image" && creative.image_path) {
    return NextResponse.json(
      {
        kind: "image",
        isHouse,
        src: publicUrl(creative.image_path),
        w: creative.width,
        h: creative.height,
        alt: creative.alt_text ?? "",
        href: creative.target_url,
        ...token,
      },
      NO_STORE,
    );
  }
  return NextResponse.json(
    {
      kind: "internal",
      isHouse,
      headline: creative.headline,
      body: creative.body,
      ctaLabel: creative.cta_label,
      href: creative.target_url,
      // Gestaltung (F3): theme immer, bg nur bei custom.
      theme: creative.theme,
      ...(creative.theme === "custom" && creative.bg_color ? { bg: creative.bg_color } : {}),
      ...token,
    },
    NO_STORE,
  );
}

// Ereignis-Eingang (J3/J4/J5): immer 204, nie Fehlertext. Reihenfolge:
// Body-Groesse, Form, Bot-UA, Token, Pfad/Platzierung, dann RPC.
const MAX_BODY = 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  try {
    const { code } = await params;
    const text = await request.text();
    if (!text || text.length > MAX_BODY) return done();
    let body: unknown;
    try { body = JSON.parse(text); } catch { return done(); }
    if (!body || typeof body !== "object") return done();
    const { k, t } = body as { k?: unknown; t?: unknown };
    if (typeof k !== "string" || (t !== "v" && t !== "c")) return done();
    if (isbot(request.headers.get("user-agent"))) return done();
    const payload = verifyDelivery(k);
    if (!payload) return done();

    const supabase = createServiceClient();
    const { data: placement } = await supabase
      .from("ad_placements")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!placement || placement.id !== payload.p) return done();

    const { error } = await supabase.rpc("module_stats_increment", {
      p_campaign: payload.c,
      p_creative: payload.r,
      p_placement: payload.p,
      p_kind: t,
    });
    if (error) console.error("[module] stats increment failed:", error.message);
  } catch (err) {
    console.error("[module] event handling failed:", err);
  }
  return done();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const url = new URL(request.url);
  const v = parseInt(url.searchParams.get("v") ?? "0", 10) || 0;
  const a = url.searchParams.get("a");        // Artikel-Slug
  const r = url.searchParams.get("r");        // Ressort-Slug
  const p = url.searchParams.get("p");        // Vorschau-Token

  const supabase = createServiceClient();
  const publicUrl = (path: string) => supabase.storage.from("modules").getPublicUrl(path).data.publicUrl;

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

  // 1b. Vorschau (G5): Kampagne per Token; hat sie eine Buchung auf dieser
  // Platzierung, wird IHR Kreativ geliefert — Status und Zeitraum ignoriert,
  // keine Ziehung. Sonst normaler Pfad.
  if (p && /^[0-9a-f]{48}$/.test(p)) {
    const { data: pc } = await supabase
      .from("ad_campaigns")
      .select(`id, is_house, bookings:ad_bookings(placement_id), creatives:ad_creatives(${CREATIVE_SELECT})`)
      .eq("preview_token", p)
      .maybeSingle();
    if (pc && (pc.bookings ?? []).some((b) => b.placement_id === placement.id)) {
      const creative = pickCreative(pc.creatives as unknown as CreativeCand[], variant, placement.id);
      // Vorschau wird nicht gezaehlt: kein Token.
      if (creative) return respond(creative, pc.is_house, publicUrl, null);
    }
  }

  // 2. Kandidaten: live-Kampagnen, Kreativ aktiv + Variante passend.
  const { data, error } = await supabase
    .from("ad_bookings")
    .select(
      `scope, scope_ref, period, campaign:ad_campaigns(id, weight, is_house, status, creatives:ad_creatives(${CREATIVE_SELECT}))`,
    )
    .eq("placement_id", placement.id);
  if (error || !data) return EMPTY();

  const now = Date.now();
  type Cand = {
    campaignId: string;
    weight: number;
    isHouse: boolean;
    scope: string;
    scopeRef: string | null;
    creative: CreativeCand;
  };
  const cands: Cand[] = [];
  for (const b of data as unknown as BookingCand[]) {
    if (!b.campaign) continue;
    if (b.campaign.status !== "live") continue;
    if (!nowInPeriod(b.period, now)) continue;
    const creative = pickCreative(b.campaign.creatives, variant, placement.id);
    if (!creative) continue;
    cands.push({
      campaignId: b.campaign.id,
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

  // Gewicht pro Kampagne, nicht pro Buchung: erste Buchung je Kampagne gewinnt.
  const seen = new Set<string>();
  const perCampaign = level.filter((c) => {
    if (seen.has(c.campaignId)) return false;
    seen.add(c.campaignId);
    return true;
  });

  // 4. Nicht-House schlaegt House.
  const nonHouse = perCampaign.filter((c) => !c.isHouse);
  const pool = nonHouse.length > 0 ? nonHouse : perCampaign;

  // Gewichtet-zufaellig ziehen.
  const total = pool.reduce((sum, c) => sum + Math.max(1, c.weight), 0);
  let roll = Math.random() * total;
  let picked = pool[0];
  for (const c of pool) {
    roll -= Math.max(1, c.weight);
    if (roll < 0) { picked = c; break; }
  }

  // 5. Antwort mit Auslieferungs-Token.
  const k = signDelivery({ c: picked.campaignId, r: picked.creative.id, p: placement.id });
  return respond(picked.creative, picked.isHouse, publicUrl, k);
}
