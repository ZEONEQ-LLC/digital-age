// Client-sichere Typen + Konstanten fuer das Platzierungssystem.
// KEIN Server-Import hier — wird von Client-Komponenten genutzt.
import type { Database } from "@/lib/database.types";

export type AdvertiserRow = Database["public"]["Tables"]["ad_advertisers"]["Row"];
export type ContactRow = Database["public"]["Tables"]["ad_contacts"]["Row"];
export type PlacementRow = Database["public"]["Tables"]["ad_placements"]["Row"];
export type CampaignRow = Database["public"]["Tables"]["ad_campaigns"]["Row"];
export type BookingRow = Database["public"]["Tables"]["ad_bookings"]["Row"];
export type CreativeRow = Database["public"]["Tables"]["ad_creatives"]["Row"];

export type CampaignStatus =
  | "draft" | "offer" | "confirmed" | "live" | "paused" | "ended" | "cancelled";

export const CAMPAIGN_STATUSES: { code: CampaignStatus; label: string }[] = [
  { code: "draft", label: "Entwurf" },
  { code: "offer", label: "Angebot" },
  { code: "confirmed", label: "Bestätigt" },
  { code: "live", label: "Live" },
  { code: "paused", label: "Pausiert" },
  { code: "ended", label: "Beendet" },
  { code: "cancelled", label: "Storniert" },
];

export function statusLabel(code: string): string {
  return CAMPAIGN_STATUSES.find((s) => s.code === code)?.label ?? code;
}

export type ScopeKind = "global" | "ressort" | "article";

export const SCOPE_KINDS: { code: ScopeKind; label: string }[] = [
  { code: "global", label: "Global (überall)" },
  { code: "ressort", label: "Ressort" },
  { code: "article", label: "Artikel" },
];

// Die drei bekannten Ressort-Slugs (== categories.slug). scope_ref bei
// scope='ressort' MUSS einer davon sein; ModuleSlot sendet denselben Wert als r.
export const RESSORT_SLUGS: { slug: string; label: string }[] = [
  { slug: "ki-business", label: "KI & Business" },
  { slug: "future-tech", label: "Future Tech" },
  { slug: "swiss-ai", label: "Swiss AI" },
];

// View-Model fuer die Uebersichtsliste.
export type CampaignOverviewVM = {
  id: string;
  name: string;
  advertiserName: string | null;
  isHouse: boolean;
  status: string;
  priceChf: number | null;
  placementLabels: string[];
  periodLabel: string;
};

export type AdvertiserWithContacts = AdvertiserRow & { contacts: ContactRow[] };

export type CampaignDetail = {
  campaign: CampaignRow;
  advertiserName: string | null;
  bookings: (BookingRow & { placementLabel: string; placementCode: string })[];
  creatives: CreativeRow[];
};

// ── Action-Inputs + Result ──
export type ActionResult = { ok: true } | { ok: false; error: string };
export type ActionResultId = { ok: true; id: string } | { ok: false; error: string };

export type AdvertiserInput = {
  name: string;
  uid?: string | null;
  billing_address?: string | null;
  billing_email?: string | null;
  is_agency?: boolean;
  commission_pct?: number | null;
  notes?: string | null;
};

export type ContactInput = {
  advertiser_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
};

export type CampaignInput = {
  name: string;
  is_house: boolean;
  advertiser_id?: string | null;
  price_chf?: number | null;
  weight: number;
  notes?: string | null;
};

export type BookingInput = {
  campaign_id: string;
  placement_id: string;
  scope: ScopeKind;
  scope_ref?: string | null;
  from: string;        // ISO date/datetime (Untergrenze, inklusiv)
  to?: string | null;  // ISO oder null = offen
};

export type CreativeInput = {
  campaign_id: string;
  variant: "desktop" | "mobile";
  headline: string;
  body?: string | null;
  cta_label?: string | null;
  target_url: string;
  is_active?: boolean;
};

// tstzrange-Textformat -> lesbares Label. Offene Obergrenze => "unbegrenzt".
export function formatPeriod(period: string): string {
  const parsed = parsePeriod(period);
  if (!parsed) return period;
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }) : null;
  const from = fmt(parsed.lower);
  const to = fmt(parsed.upper);
  if (from && to) return `${from} – ${to}`;
  if (from && !to) return `ab ${from}`;
  if (!from && to) return `bis ${to}`;
  return "unbegrenzt";
}

// Parst ein tstzrange-Textliteral wie ["2026-09-21 12:00:00+00",) in
// ISO-Grenzen. Leere Grenze -> null (offen).
export function parsePeriod(period: string): { lower: string | null; upper: string | null } | null {
  const m = period.match(/^[[(]([^,]*),([^\])]*)[\])]$/);
  if (!m) return null;
  const clean = (s: string): string | null => {
    const t = s.trim().replace(/^"|"$/g, "");
    return t.length > 0 ? t : null;
  };
  return { lower: clean(m[1]), upper: clean(m[2]) };
}
