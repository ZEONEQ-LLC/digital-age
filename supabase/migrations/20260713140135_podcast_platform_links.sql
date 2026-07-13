-- Podcast-Plattform-Links erweitern: Audible, SoundCloud, YouTube.
-- Reine Verlinkung (kein Upload/Embed). Alle drei nullable, kein Default,
-- kein Backfill — bestehende Rows bleiben unveraendert (NULL).
alter table public.podcasts
  add column audible_url text,
  add column soundcloud_url text,
  add column youtube_url text;

-- Rollback:
-- alter table public.podcasts
--   drop column audible_url,
--   drop column soundcloud_url,
--   drop column youtube_url;
