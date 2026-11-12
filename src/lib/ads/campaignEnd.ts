import { parsePeriod, type PeriodValue } from "@/lib/ads/types";

// Kampagnenende (Entscheid Ali 12.11.2026): Am Tag nach dem Ende bekommt der
// Kunde den Abschlussbericht, sein Vorschau-Link bleibt danach noch 30 Tage
// gueltig. Rein, ohne DB — Cron (endReportJob.ts) und /vorschau/[token]
// nutzen dieselbe Rechnung. Test: __tests__/campaignEnd.manual.ts.

export const PREVIEW_VALID_DAYS_AFTER_END = 30;

// Der Cron laeuft taeglich. Nur Kampagnen, die in den letzten drei Tagen
// endeten, bekommen einen Bericht: Ein paar ausgefallene Laeufe holt er nach,
// alte Kampagnen (vor Einfuehrung des Berichts beendet) bekommen nie einen.
export const END_REPORT_GRACE_DAYS = 3;

const DAY_MS = 86_400_000;

type EndBooking = { period: PeriodValue; archived_at: string | null };

// Spaetestes Ende (exklusive Obergrenze) der nicht archivierten Buchungen.
// null = keine Buchung, eine Buchung ohne Ende (offen) oder unlesbar.
export function campaignEnd(bookings: readonly EndBooking[]): Date | null {
  let max: number | null = null;
  for (const b of bookings) {
    if (b.archived_at) continue;
    const p = parsePeriod(b.period);
    if (!p || !p.upper) return null;
    const t = new Date(p.upper).getTime();
    if (Number.isNaN(t)) return null;
    if (max === null || t > max) max = t;
  }
  return max === null ? null : new Date(max);
}

// Kampagnen, die gelaufen sind (Kundenkampagnen ab live). Entwurf, Angebot
// und Storno haben keinen Bericht und keinen Ablauf der Vorschau.
const RAN = new Set(["live", "paused", "ended"]);

export function hasRun(c: { isHouse: boolean; status: string }): boolean {
  return !c.isHouse && RAN.has(c.status);
}

export function previewExpiresAt(end: Date): Date {
  return new Date(end.getTime() + PREVIEW_VALID_DAYS_AFTER_END * DAY_MS);
}

export type PreviewValidity =
  | { expired: false; expiresAt: Date | null }
  | { expired: true; end: Date; expiredAt: Date };

// Vorschau-Link einer gelaufenen Kundenkampagne laeuft 30 Tage nach dem Ende
// ab. Offene oder noch laufende Kampagnen, House und Entwuerfe: nie.
export function previewValidity(
  c: { isHouse: boolean; status: string; bookings: readonly EndBooking[] },
  now: number = Date.now(),
): PreviewValidity {
  if (!hasRun(c)) return { expired: false, expiresAt: null };
  const end = campaignEnd(c.bookings);
  if (!end) return { expired: false, expiresAt: null };
  const expiresAt = previewExpiresAt(end);
  if (now >= expiresAt.getTime()) return { expired: true, end, expiredAt: expiresAt };
  return { expired: false, expiresAt: end.getTime() <= now ? expiresAt : null };
}

// Bericht faellig: gelaufene Kundenkampagne, Ende vorbei, aber hoechstens
// END_REPORT_GRACE_DAYS her, und mindestens eine Buchung ohne Bericht.
export function endReportDue(
  c: { isHouse: boolean; status: string; bookings: readonly (EndBooking & { end_report_sent_at: string | null })[] },
  now: number = Date.now(),
): Date | null {
  if (!hasRun(c)) return null;
  const end = campaignEnd(c.bookings);
  if (!end) return null;
  const t = end.getTime();
  if (t > now || t <= now - END_REPORT_GRACE_DAYS * DAY_MS) return null;
  const pending = c.bookings.some((b) => !b.archived_at && !b.end_report_sent_at);
  return pending ? end : null;
}

// Letzter Tag inklusiv (Obergrenze exklusiv, 24:00 Zuerich), dd.MM.yyyy.
export function formatLastDay(d: Date): string {
  return new Date(d.getTime() - 1).toLocaleDateString("de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich",
  });
}
