-- Werbung: Mail bei Kampagnenende (Backlog-Karte «Abschlussreport an Kunden»,
-- Entscheid Ali 12.11.2026: Mail mit den finalen Zahlen und dem Vorschau-Link,
-- der bis 30 Tage nach Kampagnenende gueltig bleibt).
--
-- Kampagnenende = spaetestes Ende der nicht archivierten Buchungen einer
-- Kundenkampagne. Der taegliche Cron (/api/module/daily) verschickt den
-- Bericht, sobald dieses Ende vorbei ist, und markiert danach alle Buchungen
-- der Kampagne. Verlaengern bzw. Reaktivieren mit neuem Enddatum setzt die
-- Markierung zurueck (wie expiry_notified_at), damit das neue Ende wieder
-- einen Bericht ausloest.
--
-- Additiv: neue, nullable Spalte. RLS und Grants von ad_bookings gelten
-- unveraendert (Editor-Policy, Service-Role im Cron).

alter table public.ad_bookings
  add column end_report_sent_at timestamptz;

comment on column public.ad_bookings.end_report_sent_at is
  'Zeitpunkt des Abschlussberichts (Mail mit finalen Zahlen nach Kampagnenende) an den Kunden. null = fuer das aktuelle Ende noch nicht gesendet.';

-- Rollback (auskommentiert, nur als Doku):
-- alter table public.ad_bookings drop column if exists end_report_sent_at;
