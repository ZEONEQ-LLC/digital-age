-- Werbung: Zahlen bleiben erhalten, wenn ein Kreativ entfernt wird
-- (Backlog 24.09.2026, Prioritaet Hoch).
--
-- Befund: ad_stats_daily.creative_id hatte ON DELETE CASCADE. Wer ein Motiv
-- loeschte und neu anlegte, loeschte damit die Impressionen und Klicks dieser
-- Kreative (nachgewiesen bei handyabo.com, 23.09.). Vor dem ersten zahlenden
-- Kunden beheben, sonst stimmt der Kundenreport nicht mehr.
--
--   a) ad_creatives.archived_at timestamptz null (null = aktiv).
--      Archivierte Kreative sind immer is_active = false (CHECK), damit alle
--      bestehenden Gates (Abdeckung, Aktivierung, Auslieferung, Vorschau,
--      Slot-Reservierung) ohne Aenderung weiter stimmen.
--   b) ad_stats_daily.creative_id: ON DELETE CASCADE -> NO ACTION.
--      Ein Kreativ mit Zahlen laesst sich nicht mehr loeschen; der Code
--      archiviert es stattdessen (adActions.removeCreativeRow). NO ACTION
--      statt RESTRICT, damit das Loeschen einer ganzen Kampagne weiter
--      funktioniert: die Kaskade ueber campaign_id raeumt die Zahlen in
--      derselben Anweisung weg, die Pruefung laeuft erst am Ende.
--
-- Rollback (Doku):
--   alter table public.ad_stats_daily drop constraint ad_stats_daily_creative_id_fkey;
--   alter table public.ad_stats_daily add constraint ad_stats_daily_creative_id_fkey
--     foreign key (creative_id) references public.ad_creatives(id) on delete cascade;
--   alter table public.ad_creatives drop constraint if exists ad_creatives_archived_inactive;
--   alter table public.ad_creatives drop column if exists archived_at;

-- =========================================================================
-- a) Archiv-Spalte
-- =========================================================================
alter table public.ad_creatives
  add column archived_at timestamptz null;

alter table public.ad_creatives
  add constraint ad_creatives_archived_inactive
  check (archived_at is null or is_active = false);

comment on column public.ad_creatives.archived_at is
  'Archiviert statt geloescht, weil ad_stats_daily Zahlen zu diesem Kreativ hat. null = aktiv. Archivierte Zeilen sind immer is_active = false.';

-- =========================================================================
-- b) Zahlen ueberleben das Kreativ
-- =========================================================================
alter table public.ad_stats_daily
  drop constraint ad_stats_daily_creative_id_fkey;

alter table public.ad_stats_daily
  add constraint ad_stats_daily_creative_id_fkey
  foreign key (creative_id) references public.ad_creatives(id) on delete no action;
