import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  MAX_ADS,
  ROTATION_LOOKBACK,
  adCampaignIds,
  describeCreative,
  isRunningNow,
  newsletterAdHref,
  orderAdProposals,
  pickNewsletterCreative,
  runningUntil,
  sumNewsletterAdStats,
  type AdBookingRow,
  type AdCreativeRow,
  type IssueAd,
  type NewsletterAdIssueStats,
  type NewsletterAdStats,
} from "@/lib/newsletter/ads";
import { SITE_URL } from "@/lib/newsletter/mail";

// Anzeigen im Newsletter (PR 214): Kampagnen lesen und in Momentaufnahmen
// fuer eine Ausgabe uebersetzen. Der Client wird uebergeben: Sitzung im Admin
// (RLS: Editor liest ad_*), Service-Client im Entwurfs-Job und beim Versand.
type Sb = SupabaseClient<Database>;

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  is_house: boolean;
  weight: number;
  in_newsletter: boolean;
  utm_enabled: boolean;
  utm_campaign: string | null;
  advertiser: { name: string } | null;
  bookings: AdBookingRow[];
  creatives: AdCreativeRow[];
};

const CAMPAIGN_SELECT =
  "id, name, status, is_house, weight, in_newsletter, utm_enabled, utm_campaign, advertiser:ad_advertisers!ad_campaigns_advertiser_id_fkey(name), bookings:ad_bookings(period, paused_at, archived_at), creatives:ad_creatives!ad_creatives_campaign_id_fkey(id, kind, variant, placement_id, headline, body, cta_label, target_url, is_active, image_path, width, height, alt_text, archived_at)";

// Kampagne, die im Newsletter stehen kann, mit dem Kreativ, das dort erscheint.
export type AdCandidate = {
  ad: IssueAd;
  // Mit Haekchen «Im Newsletter zeigen» und gerade laufend: wird fuer neue
  // Ausgaben vorgeschlagen.
  proposed: boolean;
  running: boolean;
  runsUntil: string | null;
  weight: number;
  creativeLabel: string;
};

function toAd(c: CampaignRow, publicUrl: (path: string) => string): { ad: IssueAd; creative: AdCreativeRow } | null {
  const creative = pickNewsletterCreative(c.creatives ?? []);
  if (!creative) return null;
  const href = newsletterAdHref(creative.target_url, c, SITE_URL);
  if (!href) return null;
  const image = creative.kind === "image" && creative.image_path ? publicUrl(creative.image_path) : null;
  return {
    creative,
    ad: {
      campaignId: c.id,
      creativeId: creative.id,
      name: c.name,
      advertiser: c.advertiser?.name ?? "",
      isHouse: c.is_house,
      kind: image ? "image" : "text",
      imageUrl: image,
      alt: creative.alt_text?.trim() ?? "",
      headline: creative.headline?.trim() ?? "",
      body: creative.body?.trim() ?? "",
      cta: creative.cta_label?.trim() ?? "",
      href,
    },
  };
}

async function loadLive(supabase: Sb, ids?: string[]): Promise<CampaignRow[]> {
  let q = supabase.from("ad_campaigns").select(CAMPAIGN_SELECT).eq("status", "live");
  if (ids) q = q.in("id", ids);
  const { data, error } = await q;
  if (error) {
    console.error("[newsletter:ads] Kampagnen nicht lesbar:", error.message);
    return [];
  }
  return (data ?? []) as unknown as CampaignRow[];
}

// Alle Kampagnen auf «Live» mit einem Kreativ fuer den Newsletter (Auswahl
// im Entwurf). Kundenkampagnen zuerst, dann House, je nach Name.
export async function loadAdCandidates(supabase: Sb, now: number = Date.now()): Promise<AdCandidate[]> {
  const publicUrl = (path: string) => supabase.storage.from("modules").getPublicUrl(path).data.publicUrl;
  const out: AdCandidate[] = [];
  for (const c of await loadLive(supabase)) {
    const built = toAd(c, publicUrl);
    if (!built) continue;
    const running = isRunningNow(c.bookings ?? [], now);
    out.push({
      ad: built.ad,
      proposed: !c.is_house && c.in_newsletter && running,
      running,
      runsUntil: runningUntil(c.bookings ?? [], now),
      weight: c.weight,
      creativeLabel: describeCreative(built.creative),
    });
  }
  return out.sort((a, b) => Number(a.ad.isHouse) - Number(b.ad.isHouse) || a.ad.name.localeCompare(b.ad.name, "de"));
}

// Momentaufnahmen fuer die gewuenschten Kampagnen, in derselben Reihenfolge.
// `missing`: Kampagnen, die nicht mehr auf «Live» stehen oder kein passendes
// Kreativ mehr haben. Der Aufrufer entscheidet, ob das ein Fehler ist (Versand)
// oder ob die Anzeige still wegfaellt (Speichern, Vorschau).
export async function resolveAds(
  supabase: Sb,
  wanted: unknown,
): Promise<{ ads: IssueAd[]; missing: string[] }> {
  const ids = adCampaignIds(wanted);
  if (ids.length === 0) return { ads: [], missing: [] };
  const publicUrl = (path: string) => supabase.storage.from("modules").getPublicUrl(path).data.publicUrl;
  const rows = await loadLive(supabase, ids);
  const byId = new Map(rows.map((c) => [c.id, c]));
  const ads: IssueAd[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const c = byId.get(id);
    const built = c ? toAd(c, publicUrl) : null;
    if (built) ads.push(built.ad);
    else missing.push(id);
  }
  return { ads: ads.slice(0, MAX_ADS), missing };
}

// Vorschlag fuer einen neuen Entwurf: laufende Kundenkampagnen mit Haekchen,
// wer zuletzt seltener dran war zuerst, hoechstens MAX_ADS.
export async function proposeAds(supabase: Sb, now: number = Date.now()): Promise<IssueAd[]> {
  const candidates = (await loadAdCandidates(supabase, now)).filter((c) => c.proposed);
  if (candidates.length === 0) return [];
  const { data: recent } = await supabase
    .from("newsletter_issues")
    .select("sections")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(ROTATION_LOOKBACK);
  const seen = (recent ?? []).map((r) => adCampaignIds((r.sections as { ads?: unknown } | null)?.ads));
  return orderAdProposals(
    candidates.map((c) => ({ campaignId: c.ad.campaignId, name: c.ad.name, weight: c.weight, ad: c.ad })),
    seen,
  )
    .slice(0, MAX_ADS)
    .map((c) => c.ad);
}

// Zahlen einer Kampagne im Newsletter: je versendete Ausgabe Zustellungen
// (aus der Ausgabe) und Klicks (newsletter_ad_clicks). null = stand nie drin.
export async function getNewsletterAdStats(supabase: Sb, campaignId: string): Promise<NewsletterAdStats | null> {
  const [{ data: issues, error }, { data: clicks }] = await Promise.all([
    supabase
      .from("newsletter_issues")
      .select("id, subject, sent_at, delivered_count")
      .eq("status", "sent")
      .contains("sections", { ads: [{ campaignId }] })
      .order("sent_at", { ascending: false })
      .limit(100),
    supabase.from("newsletter_ad_clicks").select("issue_id, clicks").eq("campaign_id", campaignId),
  ]);
  if (error) {
    console.error("[newsletter:ads] Ausgaben nicht lesbar:", error.message);
    return null;
  }
  if (!issues || issues.length === 0) return null;
  const byIssue = new Map((clicks ?? []).map((r) => [r.issue_id, r.clicks]));
  const rows: NewsletterAdIssueStats[] = issues.map((i) => ({
    issueId: i.id,
    sentAt: i.sent_at,
    subject: i.subject,
    sends: i.delivered_count,
    clicks: byIssue.get(i.id) ?? 0,
  }));
  return sumNewsletterAdStats(rows);
}
