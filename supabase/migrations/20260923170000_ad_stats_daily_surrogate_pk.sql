-- Hotfix: PostgREST erkennt ad_stats_daily wegen des zusammengesetzten PK aus
-- FK-Spalten als Junction-Tabelle (M2M ad_campaigns<->ad_creatives) und meldet
-- PGRST201 bei jedem Embed ohne FK-Hint -> Auslieferung leer. Surrogat-PK;
-- Eindeutigkeit bleibt als UNIQUE (Arbiter fuer on conflict in
-- module_stats_increment, dort keine Aenderung noetig).
alter table public.ad_stats_daily
  add column id uuid not null default gen_random_uuid();
alter table public.ad_stats_daily drop constraint ad_stats_daily_pkey;
alter table public.ad_stats_daily
  add constraint ad_stats_daily_pkey primary key (id);
alter table public.ad_stats_daily
  add constraint ad_stats_daily_campaign_creative_placement_day_key
  unique (campaign_id, creative_id, placement_id, day);

-- Rollback (Doku):
-- alter table public.ad_stats_daily drop constraint ad_stats_daily_campaign_creative_placement_day_key;
-- alter table public.ad_stats_daily drop constraint ad_stats_daily_pkey;
-- alter table public.ad_stats_daily drop column id;
-- alter table public.ad_stats_daily add primary key (campaign_id, creative_id, placement_id, day);
