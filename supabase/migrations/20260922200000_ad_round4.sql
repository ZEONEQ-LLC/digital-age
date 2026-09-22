-- Werbe-/Platzierungssystem — Runde 4 (additiv)
-- Baut auf 20260921120000 / 20260921130000 / 20260922150000 auf (alle angewandt; NICHT aendern).
--   a) Doppelbuchung sperren (F2): identische Buchung (Kampagne, Platzierung, Scope,
--      Referenz) mit ueberlappendem Zeitraum ist verboten. Exclusion-Constraint via
--      btree_gist (seit 20260921120000 aktiv). Postgres validiert den Bestand beim
--      Anlegen — bei vorhandenen Duplikaten schlaegt der db push fehl (kein stilles Loeschen).
--   b) Gestaltung (F3) auf ad_creatives: theme + bg_color (nur bei custom).
--
-- Rollback (manuell):
--   alter table public.ad_bookings drop constraint if exists ad_bookings_no_duplicate;
--   alter table public.ad_creatives
--     drop constraint if exists ad_creatives_custom_bg,
--     drop column if exists bg_color,
--     drop column if exists theme;

-- =========================================================================
-- a) Doppelbuchung (F2)
-- =========================================================================
alter table public.ad_bookings
  add constraint ad_bookings_no_duplicate
  exclude using gist (
    campaign_id with =,
    placement_id with =,
    scope with =,
    (coalesce(scope_ref, '')) with =,
    period with &&
  );

-- =========================================================================
-- b) Gestaltung (F3) — Bestand bekommt per Default 'card', kein Backfill noetig.
-- =========================================================================
alter table public.ad_creatives
  add column theme text not null default 'card'
    check (theme in ('card', 'orange', 'green', 'dark', 'custom')),
  add column bg_color text
    check (bg_color is null or bg_color ~ '^#[0-9a-f]{6}$'),
  add constraint ad_creatives_custom_bg check (theme <> 'custom' or bg_color is not null);
