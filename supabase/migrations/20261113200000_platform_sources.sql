-- KI-Plattformen aus festen Quellen statt Websuche (Wunsch Ali 13.11.2026,
-- Kosten). Additiv:
--   * Hosting «CN» (Entscheid Ali: chinesische Plattformen aufnehmen,
--     gekennzeichnet).
--   * pricing_url: offizielle Preisseite, die der Job woechentlich selbst
--     abruft; page_hash/page_checked_at/page_status: Stand der letzten Pruefung
--     (KI nur, wenn sich die Preisangaben geaendert haben).
--   * source_keys: Namen, unter denen die Plattform in den Quellen erscheint
--     (Hersteller in der Arena-Rangliste, Entwickler im App Store), damit
--     bekannte Eintraege nicht als neu gelten.
--   * ai_platform_source_seen: bereits beurteilte Kandidaten aus den Quellen
--     (App-Store-Apps, Hersteller), damit die KI jeden nur einmal sieht.
--     Nur Service-Role (RLS ohne Policies).

alter table public.ai_platforms drop constraint if exists ai_platforms_hosting_check;
alter table public.ai_platforms add constraint ai_platforms_hosting_check
  check (hosting in ('CH', 'EU', 'US', 'CN'));

alter table public.ai_platforms
  add column if not exists pricing_url text check (pricing_url is null or pricing_url ~ '^https://'),
  add column if not exists page_hash text,
  add column if not exists page_checked_at timestamptz,
  add column if not exists page_status text,
  add column if not exists source_keys text[] not null default '{}';

comment on column public.ai_platforms.pricing_url is 'Offizielle Preisseite; der Job ruft sie woechentlich ab (leer = url).';
comment on column public.ai_platforms.page_status is 'Ergebnis des letzten Abrufs: ok, unchanged, blocked, script, error.';
comment on column public.ai_platforms.source_keys is 'Namen in den Quellen (Arena-Hersteller, App-Store-Entwickler), klein geschrieben.';

create table if not exists public.ai_platform_source_seen (
  key text primary key,
  source text not null,
  label text not null,
  verdict text not null check (verdict in ('ai', 'other', 'covered', 'added', 'failed')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.ai_platform_source_seen enable row level security;

-- Startwerte fuer den Bestand (Preisseiten am 13.11.2026 per Abruf geprueft;
-- Midjourney sperrt Bots, Perplexity laedt Preise per JavaScript, bei
-- Stability und Swiss GPT ist die Preisseite noch offen).
update public.ai_platforms set pricing_url = 'https://chatgpt.com/pricing', source_keys = '{openai,chatgpt}' where slug = 'chatgpt';
update public.ai_platforms set pricing_url = 'https://claude.com/pricing', source_keys = '{anthropic,claude}' where slug = 'claude';
update public.ai_platforms set pricing_url = 'https://cursor.com/pricing', source_keys = '{cursor,anysphere}' where slug = 'cursor';
update public.ai_platforms set pricing_url = 'https://elevenlabs.io/pricing', source_keys = '{elevenlabs}' where slug = 'elevenlabs';
update public.ai_platforms set pricing_url = 'https://gemini.google/subscriptions/', source_keys = '{google,gemini,deepmind}' where slug = 'gemini';
update public.ai_platforms set pricing_url = 'https://github.com/features/copilot/plans', source_keys = '{github copilot}' where slug = 'github-copilot';
update public.ai_platforms set source_keys = '{midjourney}' where slug = 'midjourney';
update public.ai_platforms set pricing_url = 'https://mistral.ai/pricing', source_keys = '{mistral,mistralai,le chat}' where slug = 'mistral-ai';
update public.ai_platforms set source_keys = '{perplexity}' where slug = 'perplexity';
update public.ai_platforms set pricing_url = 'https://runwayml.com/pricing', source_keys = '{runway,runwayml}' where slug = 'runway';
update public.ai_platforms set source_keys = '{stability,stabilityai,stable diffusion}' where slug = 'stable-diffusion';
update public.ai_platforms set pricing_url = 'https://suno.com/pricing', source_keys = '{suno}' where slug = 'suno';
update public.ai_platforms set source_keys = '{alpineai,swiss gpt}' where slug = 'swiss-gpt';
update public.ai_platforms set source_keys = '{dall-e}' where slug = 'dall-e-3';

-- Rollback:
-- drop table if exists public.ai_platform_source_seen;
-- alter table public.ai_platforms drop column if exists pricing_url, drop column if exists page_hash,
--   drop column if exists page_checked_at, drop column if exists page_status, drop column if exists source_keys;
-- alter table public.ai_platforms drop constraint if exists ai_platforms_hosting_check;
-- alter table public.ai_platforms add constraint ai_platforms_hosting_check check (hosting in ('CH', 'EU', 'US'));
