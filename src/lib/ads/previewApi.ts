import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isPlacementCode, type PlacementCode } from "@/lib/ads/placements";

// Lesepfad fuer /vorschau/[token] (G5): Service-Client, Lookup per Token.
// Nach aussen nur, was der Kunde sehen soll: Kampagnenname, Kundenname,
// Buchungen, Kreative, Freigabe-Status. Keine Adresse, kein Preis, keine ids
// ausser fuer React-Keys.
export type PreviewCreative = {
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

export type PreviewBooking = {
  id: string;
  placementCode: PlacementCode | null;
  placementLabel: string;
  scope: string;
  scope_ref: string | null;
  period: unknown;
  desktop: PreviewCreative | null;
  mobile: PreviewCreative | null;
  viewHref: string;
};

export type PreviewCampaign = {
  token: string;
  id: string;
  name: string;
  status: string;
  isHouse: boolean;
  advertiserName: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedNote: string | null;
  bookings: PreviewBooking[];
};

type Row = {
  id: string;
  name: string;
  status: string;
  is_house: boolean;
  approved_at: string | null;
  approved_by: string | null;
  approved_note: string | null;
  advertiser: { name: string } | null;
  bookings: {
    id: string;
    placement_id: string;
    scope: string;
    scope_ref: string | null;
    period: unknown;
    placement: { code: string; label: string } | null;
  }[];
  creatives: PreviewCreative[];
};

const RESSORT_PATH: Record<string, string> = {
  "ki-business": "/ki-im-business",
  "future-tech": "/future-tech",
  "swiss-ai": "/swiss-ai",
};

// Kreativ je Buchung wie in der Auslieferung: aktiv, Variante, zuerst
// placement_id = Platzierung, sonst null.
function pick(creatives: PreviewCreative[], variant: string, placementId: string): PreviewCreative | null {
  const active = creatives.filter((c) => c.is_active && c.variant === variant);
  return active.find((c) => c.placement_id === placementId) ?? active.find((c) => c.placement_id === null) ?? null;
}

export async function getPreviewCampaign(token: string): Promise<PreviewCampaign | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select(
      "id, name, status, is_house, approved_at, approved_by, approved_note, advertiser:ad_advertisers(name), " +
        "bookings:ad_bookings(id, placement_id, scope, scope_ref, period, placement:ad_placements(code, label)), " +
        "creatives:ad_creatives!ad_creatives_campaign_id_fkey(id, kind, variant, placement_id, headline, body, cta_label, target_url, is_active, theme, bg_color, image_path, width, height, alt_text)",
    )
    .eq("preview_token", token)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as Row;

  // Ziel-Link "Auf der Seite ansehen" je Platzierung (mit ?vorschau=<token>).
  async function newestArticleSlug(ressort: string | null): Promise<string | null> {
    let q = supabase
      .from("articles")
      .select("slug, category:categories!inner(slug)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1);
    if (ressort) q = q.filter("category.slug", "eq", ressort);
    const { data: art } = await q;
    return art?.[0]?.slug ?? null;
  }

  const bookings: PreviewBooking[] = [];
  for (const b of row.bookings ?? []) {
    const code = b.placement?.code ?? "";
    const placementCode = isPlacementCode(code) ? code : null;
    let path = "/";
    if (placementCode === "hub_sidebar") {
      path = (b.scope === "ressort" && b.scope_ref && RESSORT_PATH[b.scope_ref]) || "/ki-im-business";
    } else if (placementCode === "swiss_ai_sidebar") {
      path = "/swiss-ai";
    } else if (placementCode === "article_inline") {
      const slug = b.scope === "article" && b.scope_ref
        ? b.scope_ref
        : await newestArticleSlug(b.scope === "ressort" ? b.scope_ref : null);
      path = slug ? `/artikel/${slug}` : "/";
    }
    bookings.push({
      id: b.id,
      placementCode,
      placementLabel: b.placement?.label ?? code,
      scope: b.scope,
      scope_ref: b.scope_ref,
      period: b.period,
      desktop: pick(row.creatives ?? [], "desktop", b.placement_id),
      mobile: pick(row.creatives ?? [], "mobile", b.placement_id),
      viewHref: `${path}?vorschau=${token}`,
    });
  }

  return {
    token,
    id: row.id,
    name: row.name,
    status: row.status,
    isHouse: row.is_house,
    advertiserName: row.advertiser?.name ?? null,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    approvedNote: row.approved_note,
    bookings,
  };
}
