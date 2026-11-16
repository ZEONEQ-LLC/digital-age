// Anzeigen im Newsletter (Wunsch Ali 16.11.2026, PR 214). Rein, ohne DB und
// ohne "server-only": Entwurfs-Job, Server Actions, Admin-Client, Mail-Vorlage
// und Test teilen Typen und Regeln. Server-Teil: adsApi.ts (Kampagnen lesen),
// adToken.ts (Zaehl-Link), Route /api/module/weiter.
//
// Grundsaetze:
//   * Eine Anzeige steht als Momentaufnahme in newsletter_issues.sections.ads.
//     Die Aufnahme baut immer der Server aus der Kampagne (nie der Browser),
//     beim Speichern, in der Vorschau und nochmals beim Versand.
//   * Format: Bild 300 x 250 (Medium Rectangle, das Motiv der Sidebar) oder
//     eine Text-Anzeige (Titel, Text, Knopf). Andere Bildformate waeren in
//     einer Mail zu klein oder zu breit.
//   * Kennzeichnung «Anzeige», bei House-Kampagnen «In eigener Sache», wie
//     auf der Website (ModuleCard).
//   * Gezaehlt werden Zustellungen (aus der Ausgabe) und Klicks (Weiterleitung),
//     getrennt von den Einblendungen der Website.
import { ASPECT_TOLERANCE, matchesExpectedSize } from "@/lib/ads/placements";
import { buildNewsletterAdUrl } from "@/lib/ads/utm";
import { isBookingActive, parsePeriod, type PeriodValue } from "@/lib/ads/types";

export const MAX_ADS = 2;
export const NEWSLETTER_AD_SIZE = { w: 300, h: 250 } as const;
export const NEWSLETTER_AD_FORMAT = `Bild ${NEWSLETTER_AD_SIZE.w} × ${NEWSLETTER_AD_SIZE.h} oder Text-Anzeige`;
// Als Satzteil: «Es braucht …».
export const NEWSLETTER_AD_NEED = `ein aktives Bild ${NEWSLETTER_AD_SIZE.w} × ${NEWSLETTER_AD_SIZE.h} oder eine aktive Text-Anzeige`;
export { ASPECT_TOLERANCE };

// Wie oft eine Kampagne zuletzt im Newsletter stand, zaehlt fuer die
// Reihenfolge der Vorschlaege: so viele versendete Ausgaben schauen wir zurueck.
export const ROTATION_LOOKBACK = 6;

export type IssueAd = {
  campaignId: string;
  creativeId: string;
  // Kampagnenname und Kunde: nur fuer die Redaktion, stehen nicht in der Mail.
  name: string;
  advertiser: string;
  isHouse: boolean;
  kind: "image" | "text";
  imageUrl: string | null;
  alt: string;
  headline: string;
  body: string;
  cta: string;
  // Ziel mit UTM. Im Versand fuehrt der Link ueber die Zaehl-Weiterleitung.
  href: string;
};

export function adLabel(ad: { isHouse: boolean }): string {
  return ad.isHouse ? "In eigener Sache" : "Anzeige";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function httpUrl(v: unknown): string {
  const u = typeof v === "string" ? v.trim() : "";
  return u.length <= 2000 && /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : "";
}

// ads aus DB (jsonb) oder Client: nur vollstaendige Eintraege, jede Kampagne
// einmal, hoechstens MAX_ADS. Eine Anzeige ohne Ziel oder ohne Inhalt faellt weg.
export function sanitizeAds(raw: unknown): IssueAd[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: IssueAd[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const campaignId = str(o.campaignId, 40).toLowerCase();
    const creativeId = str(o.creativeId, 40).toLowerCase();
    const href = httpUrl(o.href);
    if (!UUID_RE.test(campaignId) || !UUID_RE.test(creativeId) || !href || seen.has(campaignId)) continue;
    const imageUrl = httpUrl(o.imageUrl);
    const headline = str(o.headline, 120);
    const kind = o.kind === "image" && imageUrl.startsWith("https://") ? "image" : "text";
    if (kind === "text" && !headline) continue;
    seen.add(campaignId);
    out.push({
      campaignId,
      creativeId,
      name: str(o.name, 160),
      advertiser: str(o.advertiser, 160),
      isHouse: o.isHouse === true,
      kind,
      imageUrl: kind === "image" ? imageUrl : null,
      alt: str(o.alt, 200),
      headline,
      body: str(o.body, 300),
      cta: str(o.cta, 60),
      href,
    });
    if (out.length >= MAX_ADS) break;
  }
  return out;
}

// Nur die Kampagnen in ihrer Reihenfolge: Das ist alles, was der Server vom
// Browser uebernimmt. Der Rest kommt aus der Kampagne.
export function adCampaignIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const r of raw) {
    const id = r && typeof r === "object" ? str((r as Record<string, unknown>).campaignId, 40).toLowerCase() : "";
    if (UUID_RE.test(id) && !out.includes(id)) out.push(id);
    if (out.length >= MAX_ADS) break;
  }
  return out;
}

// ── Kreativ fuer den Newsletter ───────────────────────────────────────────

export type AdCreativeRow = {
  id: string;
  kind: string;
  variant: string;
  placement_id: string | null;
  headline: string | null;
  body: string | null;
  cta_label: string | null;
  target_url: string;
  is_active: boolean;
  image_path: string | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  archived_at?: string | null;
};

function isRectangle(c: AdCreativeRow): boolean {
  return c.kind === "image" && !!c.image_path && matchesExpectedSize(c.width ?? 0, c.height ?? 0, NEWSLETTER_AD_SIZE);
}

// Welches Kreativ einer Kampagne im Newsletter steht: zuerst ein Bild im
// Format 300 x 250 (das Motiv des Kunden; Desktop vor Mobile, die groessere
// Aufloesung zuerst), sonst eine Text-Anzeige (Desktop vor Mobile, ohne feste
// Platzierung zuerst). null = die Kampagne hat nichts Passendes.
export function pickNewsletterCreative(creatives: readonly AdCreativeRow[]): AdCreativeRow | null {
  const usable = creatives.filter((c) => c.is_active && !c.archived_at);
  const rank = (c: AdCreativeRow) => (c.variant === "desktop" ? 0 : 1);
  // Die id als letztes Kriterium: gleiche Kandidaten ergeben immer dasselbe Motiv.
  const images = usable
    .filter(isRectangle)
    .sort((a, b) => rank(a) - rank(b) || (b.width ?? 0) - (a.width ?? 0) || a.id.localeCompare(b.id));
  if (images[0]) return images[0];
  const texts = usable
    .filter((c) => c.kind === "internal" && !!c.headline?.trim())
    .sort((a, b) => rank(a) - rank(b) || Number(a.placement_id !== null) - Number(b.placement_id !== null) || a.id.localeCompare(b.id));
  return texts[0] ?? null;
}

// Warum eine Kampagne (noch) nicht in den Newsletter kann, fuer den Hinweis
// im Kampagnen-Formular. null = es gibt ein passendes Kreativ.
export function newsletterCreativeGap(creatives: readonly AdCreativeRow[]): string | null {
  if (pickNewsletterCreative(creatives)) return null;
  return `Für den Newsletter braucht es ${NEWSLETTER_AD_NEED}.`;
}

export function describeCreative(c: AdCreativeRow): string {
  return c.kind === "image" ? `Bild ${c.width ?? "?"} × ${c.height ?? "?"}` : `Text «${(c.headline ?? "").trim()}»`;
}

// Ziel einer Anzeige in der Mail. Relative Ziele (House, z. B. /mediadaten)
// werden absolut; Kundenkampagnen mit Kennung bekommen die UTM-Parameter.
// Leer = kein brauchbares Ziel (mailto und anderes gehoert nicht in die Mail).
export function newsletterAdHref(
  targetUrl: string,
  campaign: { is_house: boolean; utm_enabled: boolean; utm_campaign: string | null },
  siteUrl: string,
): string {
  const t = targetUrl.trim();
  if (t.startsWith("/") && !t.startsWith("//")) return `${siteUrl}${t}`;
  if (!/^https?:\/\//i.test(t)) return "";
  if (campaign.is_house || !campaign.utm_enabled || !campaign.utm_campaign) return t;
  return buildNewsletterAdUrl(t, campaign.utm_campaign);
}

// ── Laeuft die Kampagne gerade? ───────────────────────────────────────────

export type AdBookingRow = { period: PeriodValue; paused_at: string | null; archived_at: string | null };

// Mindestens eine Buchung, die weder pausiert noch archiviert ist und deren
// Zeitraum jetzt gilt. Eine Kampagne auf «Live», deren Buchungen abgelaufen
// sind, laeuft nicht mehr (der Status bleibt bis zum Beenden von Hand stehen).
export function isRunningNow(bookings: readonly AdBookingRow[], now: number): boolean {
  return bookings.some((b) => {
    if (!isBookingActive(b)) return false;
    const p = parsePeriod(b.period);
    if (!p) return false;
    const from = p.lower ? new Date(p.lower).getTime() : -Infinity;
    const to = p.upper ? new Date(p.upper).getTime() : Infinity;
    return from <= now && now < to;
  });
}

// Spaetestes Ende der laufenden Buchungen (exklusiv), null = offen oder keine.
export function runningUntil(bookings: readonly AdBookingRow[], now: number): string | null {
  let max: number | null = null;
  for (const b of bookings) {
    if (!isRunningNow([b], now)) continue;
    const p = parsePeriod(b.period);
    if (!p?.upper) return null;
    const t = new Date(p.upper).getTime();
    if (max === null || t > max) max = t;
  }
  return max === null ? null : new Date(max).toISOString();
}

// ── Vorschlag fuer eine neue Ausgabe ──────────────────────────────────────

export type AdProposalInput = { campaignId: string; name: string; weight: number };

// Reihenfolge der Vorschlaege: wer zuletzt seltener im Newsletter stand,
// kommt zuerst; bei Gleichstand das hoehere Gewicht, dann der Name. `recent`
// sind die Kampagnen der letzten versendeten Ausgaben.
export function orderAdProposals<T extends AdProposalInput>(candidates: readonly T[], recent: readonly (readonly string[])[]): T[] {
  const seen = new Map<string, number>();
  for (const issue of recent) for (const id of issue) seen.set(id, (seen.get(id) ?? 0) + 1);
  return [...candidates].sort(
    (a, b) =>
      (seen.get(a.campaignId) ?? 0) - (seen.get(b.campaignId) ?? 0) ||
      b.weight - a.weight ||
      a.name.localeCompare(b.name, "de"),
  );
}

// ── Platz in der Mail ─────────────────────────────────────────────────────

// Nach welchem Inhaltsblock (Index) eine Anzeige steht. Die erste nach dem
// ersten Block, die zweite nach dem dritten, bei weniger Bloecken am Ende.
// Ohne Inhaltsbloecke stehen alle direkt nach der Einleitung (Index -1).
export function adSlots(blockCount: number, adCount: number): number[] {
  const n = Math.min(Math.max(adCount, 0), MAX_ADS);
  if (blockCount <= 0) return Array.from({ length: n }, () => -1);
  const wanted = [0, 2];
  return Array.from({ length: n }, (_, i) => Math.min(wanted[i] ?? blockCount - 1, blockCount - 1));
}

// ── Zahlen ────────────────────────────────────────────────────────────────

export type NewsletterAdIssueStats = { issueId: string; sentAt: string | null; subject: string; sends: number; clicks: number };
export type NewsletterAdStats = { issues: NewsletterAdIssueStats[]; sends: number; clicks: number };

export const NEWSLETTER_COUNT_RULE_DU =
  "Newsletter: Zustellungen sind versendete Mails mit dieser Anzeige, nicht Öffnungen. Klicks zählen wir über eine Weiterleitung, bekannte Bots ausgeschlossen.";
export const NEWSLETTER_COUNT_RULE_SIE =
  "Newsletter: Zustellungen sind versendete Mails mit Ihrer Anzeige, nicht Öffnungen. Klicks zählen wir über eine Weiterleitung, bekannte Bots ausgeschlossen.";

export function sumNewsletterAdStats(issues: NewsletterAdIssueStats[]): NewsletterAdStats {
  return {
    issues,
    sends: issues.reduce((n, i) => n + i.sends, 0),
    clicks: issues.reduce((n, i) => n + i.clicks, 0),
  };
}
