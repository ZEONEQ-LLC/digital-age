import "server-only";
import CampaignEndReport, { endReportSubject, type EndReportRow } from "@/emails/CampaignEndReport";
import { endReportDue, formatLastDay, previewExpiresAt } from "@/lib/ads/campaignEnd";
import { recipientsWithEditorCopy, sendAdMail } from "@/lib/ads/mail";
import { getCampaignStats } from "@/lib/ads/statsApi";
import { COUNT_RULE_SIE, formatCount, formatCtr } from "@/lib/ads/statsFormat";
import type { PeriodValue } from "@/lib/ads/types";
import { createServiceClient } from "@/lib/supabase/service";
import { getBaseUrl } from "@/lib/siteUrl";

// Abschlussbericht (Entscheid Ali 12.11.2026): taeglich im Cron
// /api/module/daily nach der Ablaufwarnung. Faellig ist eine gelaufene
// Kundenkampagne, deren letzte Buchung in den letzten drei Tagen endete und
// die fuer dieses Ende noch keinen Bericht hat (campaignEnd.ts). Eine Mail an
// billing_email mit Kopie an die Redaktion: Zahlen gesamt und je Platzierung,
// Vorschau-Link (gueltig bis 30 Tage nach Ende). Erfolg -> end_report_sent_at
// auf allen nicht archivierten Buchungen; Fehler -> nichts markieren, der
// naechste Lauf versucht es innerhalb der drei Tage erneut.
export type EndReportRunResult = { checked: number; sent: number; failed: number };

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  is_house: boolean;
  preview_token: string;
  advertiser: { billing_email: string | null } | null;
  bookings: { id: string; period: PeriodValue; archived_at: string | null; end_report_sent_at: string | null }[];
};

function formatFirstDay(iso: string): string {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
}

function row(label: string, impressions: number, clicks: number, ctr: number | null): EndReportRow {
  return { label, impressions: formatCount(impressions), clicks: formatCount(clicks), ctr: formatCtr(ctr) };
}

export async function runEndReports(now: Date = new Date()): Promise<EndReportRunResult> {
  const supabase = createServiceClient();
  const result: EndReportRunResult = { checked: 0, sent: 0, failed: 0 };

  const { data, error } = await supabase
    .from("ad_campaigns")
    .select(
      "id, name, status, is_house, preview_token, advertiser:ad_advertisers(billing_email), bookings:ad_bookings(id, period, archived_at, end_report_sent_at)",
    )
    .eq("is_house", false)
    .in("status", ["live", "paused", "ended"]);
  if (error) {
    console.error("[module:daily] end report query failed:", error.message);
    result.failed += 1;
    return result;
  }

  const base = getBaseUrl();
  for (const c of (data ?? []) as unknown as CampaignRow[]) {
    const end = endReportDue({ isHouse: c.is_house, status: c.status, bookings: c.bookings ?? [] }, now.getTime());
    if (!end) continue;
    result.checked += 1;
    const to = c.advertiser?.billing_email?.trim();
    if (!to) {
      console.error(`[module:daily] Kampagne ${c.id}: keine billing_email, kein Abschlussbericht.`);
      result.failed += 1;
      continue;
    }
    let stats;
    try {
      stats = await getCampaignStats(supabase, c.id);
    } catch (err) {
      console.error(`[module:daily] Kampagne ${c.id}: Zahlen nicht lesbar:`, err);
      result.failed += 1;
      continue;
    }
    const active = (c.bookings ?? []).filter((b) => !b.archived_at);
    const periodText = stats.periodFrom
      ? `${formatFirstDay(stats.periodFrom)} – ${formatLastDay(end)}`
      : `bis ${formatLastDay(end)}`;
    const res = await sendAdMail({
      to: recipientsWithEditorCopy(to),
      subject: endReportSubject(c.name),
      element: CampaignEndReport({
        campaignName: c.name,
        periodText,
        total: row("Gesamt", stats.impressions, stats.clicks, stats.ctr),
        byPlacement: stats.byPlacement.map((p) => row(p.label, p.impressions, p.clicks, p.ctr)),
        previewUrl: `${base}/vorschau/${c.preview_token}`,
        validUntil: formatLastDay(previewExpiresAt(end)),
        countRule: COUNT_RULE_SIE,
      }),
    });
    if (!res.ok) {
      console.error(`[module:daily] Kampagne ${c.id}: Abschlussbericht nicht versendet: ${res.error}`);
      result.failed += 1;
      continue;
    }
    const { error: markErr } = await supabase
      .from("ad_bookings")
      .update({ end_report_sent_at: now.toISOString() })
      .in("id", active.map((b) => b.id));
    if (markErr) {
      console.error(`[module:daily] Kampagne ${c.id}: Markierung Abschlussbericht fehlgeschlagen: ${markErr.message}`);
      result.failed += 1;
      continue;
    }
    result.sent += 1;
  }
  return result;
}
