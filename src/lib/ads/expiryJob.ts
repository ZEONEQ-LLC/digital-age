import "server-only";
import { Resend } from "resend";
import { render } from "@react-email/render";
import CampaignExpiry, { subjectFor } from "@/emails/CampaignExpiry";
import { createServiceClient } from "@/lib/supabase/service";
import { parsePeriod } from "@/lib/ads/types";
import { getBaseUrl } from "@/lib/siteUrl";

// Ablaufwarnung (J7/J8): Buchungen, die in den naechsten 7 Tagen enden,
// Kampagne Kunde + live, noch nicht gewarnt. Eine Mail je Kampagne an
// billing_email, Kopie an die Editor-Adresse (Muster contact/mail.ts
// getEditorEmail = NEWSLETTER_REPLY_TO). Erfolg -> expiry_notified_at auf
// allen Buchungen der Gruppe; Fehler -> console.error, nichts markieren.
// Kapselt Auswahl + Versand + Markierung; die Route bleibt duenn.
export type ExpiryRunResult = { checked: number; sent: number; failed: number };

const WINDOW_DAYS = 7;

type BookingRow = {
  id: string;
  period: unknown;
  placement: { label: string } | null;
  campaign: {
    id: string;
    name: string;
    status: string;
    is_house: boolean;
    preview_token: string;
    advertiser: { billing_email: string | null } | null;
  } | null;
};

function fmtZurich(iso: string): string {
  // Obergrenze ist exklusiv (24:00) -> 1 ms abziehen = letzter Tag inklusiv (formatPeriod-Logik).
  return new Date(new Date(iso).getTime() - 1).toLocaleDateString("de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich",
  });
}

function getEditorEmail(): string | null {
  return process.env.NEWSLETTER_REPLY_TO ?? null;
}

async function sendExpiryMail(args: {
  to: string[];
  campaignName: string;
  endDate: string;
  bookings: { placementLabel: string; endDate: string }[];
  previewUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  if (!key || !from) return { ok: false, error: "RESEND_API_KEY oder NEWSLETTER_FROM_EMAIL fehlt" };
  try {
    const html = await render(
      CampaignExpiry({ campaignName: args.campaignName, endDate: args.endDate, bookings: args.bookings, previewUrl: args.previewUrl }),
    );
    const result = await new Resend(key).emails.send({
      from,
      replyTo: process.env.NEWSLETTER_REPLY_TO ?? undefined,
      to: args.to,
      subject: subjectFor(args.campaignName, args.endDate),
      html,
    });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runExpiryWarnings(now: Date = new Date()): Promise<ExpiryRunResult> {
  const supabase = createServiceClient();
  const result: ExpiryRunResult = { checked: 0, sent: 0, failed: 0 };

  // Kandidaten grob per DB (noch nicht gewarnt), Zeitfenster in JS aus
  // parsePeriod — offene Obergrenzen (upper null) fallen dabei heraus.
  const { data, error } = await supabase
    .from("ad_bookings")
    .select(
      "id, period, placement:ad_placements(label), campaign:ad_campaigns!inner(id, name, status, is_house, preview_token, advertiser:ad_advertisers(billing_email))",
    )
    .is("expiry_notified_at", null)
    .filter("campaign.status", "eq", "live")
    .filter("campaign.is_house", "eq", false);
  if (error) {
    console.error("[module:daily] booking query failed:", error.message);
    return result;
  }

  const lower = now.getTime();
  const upperLimit = lower + WINDOW_DAYS * 86_400_000;
  const groups = new Map<string, { campaign: NonNullable<BookingRow["campaign"]>; bookings: { id: string; label: string; endIso: string }[] }>();
  for (const b of (data ?? []) as unknown as BookingRow[]) {
    if (!b.campaign || b.campaign.status !== "live" || b.campaign.is_house) continue;
    const p = parsePeriod(b.period);
    if (!p || !p.upper) continue;
    const end = new Date(p.upper).getTime();
    if (Number.isNaN(end) || end < lower || end >= upperLimit) continue;
    result.checked += 1;
    const g = groups.get(b.campaign.id) ?? { campaign: b.campaign, bookings: [] };
    g.bookings.push({ id: b.id, label: b.placement?.label ?? "Platzierung", endIso: p.upper });
    groups.set(b.campaign.id, g);
  }

  const editor = getEditorEmail();
  const base = getBaseUrl();
  for (const g of groups.values()) {
    const to = g.campaign.advertiser?.billing_email?.trim();
    if (!to) {
      console.error(`[module:daily] Kampagne ${g.campaign.id}: keine billing_email, keine Warnung.`);
      result.failed += 1;
      continue;
    }
    const recipients = editor && editor !== to ? [to, editor] : [to];
    const sorted = [...g.bookings].sort((a, b) => a.endIso.localeCompare(b.endIso));
    const bookings = sorted.map((b) => ({ placementLabel: b.label, endDate: fmtZurich(b.endIso) }));
    const endDate = fmtZurich(sorted[sorted.length - 1].endIso);
    const res = await sendExpiryMail({
      to: recipients,
      campaignName: g.campaign.name,
      endDate,
      bookings,
      previewUrl: `${base}/vorschau/${g.campaign.preview_token}`,
    });
    if (!res.ok) {
      console.error(`[module:daily] Kampagne ${g.campaign.id}: Versand fehlgeschlagen: ${res.error}`);
      result.failed += 1;
      continue;
    }
    const { error: markErr } = await supabase
      .from("ad_bookings")
      .update({ expiry_notified_at: now.toISOString() })
      .in("id", sorted.map((b) => b.id));
    if (markErr) {
      console.error(`[module:daily] Kampagne ${g.campaign.id}: Markierung fehlgeschlagen: ${markErr.message}`);
      result.failed += 1;
      continue;
    }
    result.sent += 1;
  }
  return result;
}
