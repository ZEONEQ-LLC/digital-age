-- News-Ticker Phase 2 Mini-Fixes + Editor-Settings.
--
-- (1) news_ticker_config bekommt fünf neue Spalten für die Admin-UI:
--     ticker_speed, items_per_source, is_paused, scheduler_enabled,
--     scheduled_hour_cet. Alle mit Defaults, damit existierende Row keine
--     Sonderbehandlung braucht.
--
-- (2) news_items.source_name (denormalisiert). Begründung: das anon-RLS
--     auf news_sources blockt den Embed `news_sources(name)` im Public-
--     Ticker — anon sieht keine Quelle, Modal zeigt "Externe Quelle".
--     RLS auf news_sources soll bleiben (Wettbewerbs-Schutz für die
--     Quellen-Liste). Stattdessen Snapshot des Source-Names beim Insert
--     in news_items. Backfill der 10 existierenden Rows via JOIN unten.
--
-- KEIN Update am generation_prompt-Wert — Editor pflegt den über UI.

-- =========================================================================
-- 1. news_ticker_config: fünf neue Spalten
-- =========================================================================
alter table public.news_ticker_config
  add column ticker_speed text not null default 'normal'
    check (ticker_speed in ('slow', 'normal', 'fast'));

alter table public.news_ticker_config
  add column items_per_source integer not null default 10
    check (items_per_source between 1 and 30);

alter table public.news_ticker_config
  add column is_paused boolean not null default false;

alter table public.news_ticker_config
  add column scheduler_enabled boolean not null default false;

alter table public.news_ticker_config
  add column scheduled_hour_cet integer not null default 7
    check (scheduled_hour_cet between 0 and 23);

-- =========================================================================
-- 2. news_items.source_name (denormalisiert)
-- =========================================================================
alter table public.news_items
  add column source_name text;

-- Backfill: existierende Rows bekommen den Source-Namen via FK-Join.
update public.news_items i
  set source_name = s.name
  from public.news_sources s
  where i.source_id = s.id
    and i.source_name is null;

-- Spalte ist absichtlich nullable — der Refresh-Orchestrator setzt sie
-- ab jetzt immer, aber Legacy-Fallback bleibt offen. Public-Ticker fällt
-- bei null auf "Externe Quelle" zurück.

-- ROLLBACK (auskommentiert, nur als Doku):
-- alter table public.news_items drop column if exists source_name;
-- alter table public.news_ticker_config drop column if exists scheduled_hour_cet;
-- alter table public.news_ticker_config drop column if exists scheduler_enabled;
-- alter table public.news_ticker_config drop column if exists is_paused;
-- alter table public.news_ticker_config drop column if exists items_per_source;
-- alter table public.news_ticker_config drop column if exists ticker_speed;
