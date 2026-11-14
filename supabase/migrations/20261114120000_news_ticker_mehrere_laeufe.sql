-- News-Ticker: mehrere Laeufe pro Tag statt einem, und ein Gedaechtnis fuer
-- aussortierte Meldungen.
--
--   * news_ticker_config.scheduled_hours_cet: Stunden (Schweizer Zeit), zu
--     denen der stuendliche Cron den Ticker wirklich laufen laesst. Startwert
--     ist die bisherige Stunde plus 12 und 18 Uhr. scheduled_hour_cet bleibt
--     bestehen (Code vor diesem PR liest es noch) und wird beim Speichern auf
--     die erste Stunde gesetzt.
--   * news_items_skipped: Meldungen, die die KI als unpassend aussortiert hat.
--     Bisher wurde jede davon bei jedem Lauf neu beurteilt, solange sie im
--     Feed stand. Mit drei Laeufen pro Tag waere das der dreifache Aufwand.
--     Nur Service-Role (RLS ohne Policies).
--
-- Additiv: neue Spalte mit Default, neue Tabelle.

alter table public.news_ticker_config
  add column if not exists scheduled_hours_cet smallint[] not null default '{7,12,18}'::smallint[];

alter table public.news_ticker_config drop constraint if exists news_ticker_config_scheduled_hours_check;
alter table public.news_ticker_config add constraint news_ticker_config_scheduled_hours_check
  check (
    cardinality(scheduled_hours_cet) between 1 and 24
    and scheduled_hours_cet <@ array[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]::smallint[]
  );

update public.news_ticker_config
  set scheduled_hours_cet = (
    select array_agg(h order by h)
    from (select distinct unnest(array[scheduled_hour_cet, 12, 18])::smallint as h) x
  )
  where id = 1;

comment on column public.news_ticker_config.scheduled_hour_cet is
  'Veraltet: ersetzt durch scheduled_hours_cet. Wird beim Speichern auf die erste Stunde gesetzt.';

create table if not exists public.news_items_skipped (
  source_url text primary key,
  source_id uuid references public.news_sources(id) on delete cascade,
  skipped_at timestamptz not null default now()
);
create index if not exists news_items_skipped_skipped_at_idx on public.news_items_skipped (skipped_at);
alter table public.news_items_skipped enable row level security;
revoke all on public.news_items_skipped from anon, authenticated;

-- Rueckbau:
-- drop table if exists public.news_items_skipped;
-- alter table public.news_ticker_config drop constraint if exists news_ticker_config_scheduled_hours_check;
-- alter table public.news_ticker_config drop column if exists scheduled_hours_cet;
