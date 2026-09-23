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

// Statusautomat (H6): erlaubte Uebergaenge je Kampagnenart. UI zeigt nur
// diese Ziele, setCampaignStatus prueft dieselbe Konstante serverseitig;
// DB-Gates bleiben als Netz.
export const STATUS_TRANSITIONS: Record<"customer" | "house", Record<CampaignStatus, CampaignStatus[]>> = {
  customer: {
    draft: ["offer", "cancelled"],
    offer: ["confirmed", "draft", "cancelled"],
    confirmed: ["live", "offer", "cancelled"],
    live: ["paused", "ended"],
    paused: ["live", "ended"],
    ended: [],
    cancelled: ["draft"],
  },
  house: {
    draft: ["live", "cancelled"],
    offer: ["draft", "cancelled"],
    confirmed: ["live", "cancelled"],
    live: ["paused", "ended"],
    paused: ["live", "ended"],
    ended: [],
    cancelled: ["draft"],
  },
};

export function allowedStatusTargets(isHouse: boolean, from: string): CampaignStatus[] {
  const table = STATUS_TRANSITIONS[isHouse ? "house" : "customer"];
  return (table as Record<string, CampaignStatus[]>)[from] ?? [];
}

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

// Anteil an der Rotation, den die Kampagne HAETTE, wenn sie jetzt live waere (F1).
export type BookingShare = { sharePct: number; othersCount: number; reason?: string };

export type CampaignDetail = {
  campaign: CampaignRow;
  advertiserName: string | null;
  bookings: (BookingRow & { placementLabel: string; placementCode: string; share: BookingShare })[];
  creatives: CreativeRow[];
};

// ── Action-Inputs + Result ──
export type ActionResult = { ok: true } | { ok: false; error: string };
export type ActionResultId = { ok: true; id: string } | { ok: false; error: string };

export type AdvertiserInput = {
  name: string;
  uid?: string | null;              // roh; wird serverseitig zu CHE######### normalisiert
  address_addition?: string | null;
  street?: string | null;
  house_number?: string | null;
  post_office_box?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;          // ISO-2, default CH
  language?: string | null;
  billing_email?: string | null;
  payment_terms_days?: number | null;
  billing_via_agency_id?: string | null;
  is_agency?: boolean;
  commission_pct?: number | null;
  notes?: string | null;
};

// Korrespondenzsprachen fuer Kunden (client-nutzbar im Formular).
export const ADVERTISER_LANGUAGES: { code: string; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Französisch" },
  { code: "it", label: "Italienisch" },
  { code: "en", label: "Englisch" },
];

// UID auf CHE######### normalisieren: Grossschreiben, alles Nicht-Alphanumerische
// raus, HR-/MWST-Suffix verwerfen. Ungueltig -> null. Leer -> null.
export function normalizeUid(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = cleaned.match(/^CHE(\d{9})/);
  return m ? `CHE${m[1]}` : null;
}

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

export type CreativeKind = "internal" | "image";

export type CreativeInput = {
  campaign_id: string;
  kind?: CreativeKind;          // default "internal"
  variant: "desktop" | "mobile";
  placement_id?: string | null; // image: Pflicht (G1); internal: optional (null = alle)
  headline?: string | null;     // internal: Pflicht
  body?: string | null;
  cta_label?: string | null;
  target_url: string;
  is_active?: boolean;
  theme?: string;               // CREATIVE_THEMES; default "card" (nur internal)
  bg_color?: string | null;     // nur bei theme="custom" (HEX, klein)
  image_path?: string | null;   // image: Pfad im Bucket "modules" (aus uploadCreativeImage)
  width?: number | null;        // image: Pixel (serverseitig ermittelt)
  height?: number | null;
  alt_text?: string | null;     // image: Pflicht
};

// Treffer aus dem BFS-UID-Register (G6). Nichts davon wird ausserhalb der
// Formularfelder gespeichert.
export type UidLookupHit = {
  uid: string;                  // CHE#########
  name: string;
  street: string | null;
  houseNumber: string | null;
  postOfficeBox: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;              // ISO-2
  legalFormCode: string | null; // BFS-Code, z.B. 0107 = GmbH
  active: boolean;              // uidregPublicStatus = 1
};

export type UidLookupResult = { ok: true; hits: UidLookupHit[] } | { ok: false; error: string };

export { CREATIVE_THEMES, type CreativeTheme } from "@/lib/ads/creativeTheme";

// Normalisiert eine tstzrange-Grenze aus PostgREST (z.B. "2026-09-21 18:48:38.118774+00")
// nach ISO-8601, damit new Date() ueberall (auch Safari) parst: Leerzeichen -> T,
// Sekundenbruchteile auf 3 Stellen, Offset "+00"/"+01" -> "+00:00"/"+01:00".
function normalizeBound(raw: string): string | null {
  const t = raw.trim().replace(/^"|"$/g, "");
  if (t.length === 0) return null;
  return t
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00");
}

// Parst ein tstzrange-Textliteral wie ["2026-09-30 22:00:00+00","2026-10-31 23:00:00+00")
// in ISO-Grenzen. Leere Grenze -> null (offen). Nicht-String -> null.
export function parsePeriod(period: unknown): { lower: string | null; upper: string | null } | null {
  if (typeof period !== "string") return null;
  const m = period.match(/^[[(]([^,]*),([^\])]*)[\])]$/);
  if (!m) return null;
  return { lower: normalizeBound(m[1]), upper: normalizeBound(m[2]) };
}

const ZURICH_DATE: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Zurich",
};

// tstzrange -> lesbares Label in Zuercher Kalendertagen (E1). Obere Grenze ist
// exklusiv (24:00) und wird inklusiv angezeigt: (upper - 1 ms) formatieren.
// timeZone fest -> SSR-Ausgabe == Client-Ausgabe, kein Hydration-Mismatch.
export function formatPeriod(period: unknown): string {
  const parsed = parsePeriod(period);
  if (!parsed) return typeof period === "string" ? period : "";
  const fmt = (iso: string | null, minusMs: number): string | null => {
    if (!iso) return null;
    const d = new Date(new Date(iso).getTime() - minusMs);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("de-CH", ZURICH_DATE);
  };
  const from = fmt(parsed.lower, 0);
  const to = fmt(parsed.upper, 1);
  if (from && to) return `${from} – ${to}`;
  if (from && !to) return `ab ${from}`;
  if (!from && to) return `bis ${to}`;
  return "unbegrenzt";
}
