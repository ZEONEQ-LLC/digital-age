-- Podcasts: Empfehlung per Teilen aus Apple Podcasts (Backlog 26.10.2026).
--
--   a) podcasts.apple_show_id / apple_episode_id: aus dem Apple-Link
--      extrahierte IDs (Show = /id<ziffern>, Folge = ?i=<ziffern>). Dublettenschutz
--      ueber partielle Unique-Indizes: eine Folge genau einmal, eine Show genau
--      einmal als Show-Empfehlung (Folgen derselben Show bleiben erlaubt).
--      Backfill aus apple_podcasts_url fuer den Bestand (keine Dubletten, geprueft).
--   b) podcasts.ingest_status / ingest_error: Zustand der automatischen
--      Anreicherung (pending -> ready | failed). Null = manuell erfasst.
--   c) newsletter_signup_attempts.action: 'podcast_ingest' fuer das IP-Rate-Limit
--      des Ingest-Endpoints (Muster contact/pitch).
--
-- Rollback (Doku):
--   drop index if exists public.podcasts_apple_episode_id_key;
--   drop index if exists public.podcasts_apple_show_id_key;
--   alter table public.podcasts drop column if exists apple_show_id, drop column if exists apple_episode_id,
--     drop column if exists ingest_status, drop column if exists ingest_error;
--   alter table public.newsletter_signup_attempts drop constraint newsletter_signup_attempts_action_check;
--   alter table public.newsletter_signup_attempts add constraint newsletter_signup_attempts_action_check
--     check (action in ('subscribe', 'unsubscribe', 'contact', 'pitch'));

-- =========================================================================
-- a) Apple-IDs
-- =========================================================================
alter table public.podcasts
  add column apple_show_id text null,
  add column apple_episode_id text null,
  add column ingest_status text null check (ingest_status in ('pending', 'ready', 'failed')),
  add column ingest_error text null;

update public.podcasts
set apple_show_id = substring(apple_podcasts_url from '/id(\d+)'),
    apple_episode_id = substring(apple_podcasts_url from '[?&]i=(\d+)')
where apple_podcasts_url is not null;

create unique index podcasts_apple_episode_id_key
  on public.podcasts (apple_episode_id)
  where apple_episode_id is not null;

create unique index podcasts_apple_show_id_key
  on public.podcasts (apple_show_id)
  where apple_show_id is not null and apple_episode_id is null;

-- =========================================================================
-- c) Rate-Limit-Aktion
-- =========================================================================
alter table public.newsletter_signup_attempts
  drop constraint newsletter_signup_attempts_action_check;
alter table public.newsletter_signup_attempts
  add constraint newsletter_signup_attempts_action_check
  check (action in ('subscribe', 'unsubscribe', 'contact', 'pitch', 'podcast_ingest'));
