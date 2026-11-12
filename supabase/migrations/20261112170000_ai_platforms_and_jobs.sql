-- KI-Plattformen in der DB und woechentliche KI-Jobs (Wunsch Ali 12.11.2026).
--
-- ai_platforms: bisher hart im Code (KIPlattformenClient.tsx). Ein KI-Job
--   prueft woechentlich per Websuche, ob die Angaben stimmen, ergaenzt neue
--   Plattformen und archiviert eingestellte, ohne Freigabe. Ali wird per Mail
--   informiert und kann im Admin eingreifen: Eintraege bearbeiten, sperren
--   (locked: die KI aendert sie nicht mehr), archivieren, Aenderungen der KI
--   zuruecknehmen.
-- ai_platform_changes: jede Aenderung der KI mit Vorher/Nachher, Grund und
--   Quellen; Grundlage fuer «Rueckgaengig».
-- ai_job_runs: Laeufe beider Hintergrund-Jobs (platform_research,
--   prompt_generation) mit Ergebnis und Fehlern.
-- ai_prompts.ai_generated: Prompts der KI-Redaktion sind gekennzeichnet
--   (Entscheid Ali: 3 pro Woche, gekennzeichnet).
--
-- Additiv: neue Tabellen, neue Spalte mit Default. Die Spalte bekommt das
-- Spaltenrecht fuer anon (seit PR 195 liest anon ai_prompts nur spaltenweise).

create table public.ai_platforms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 60),
  category text not null check (category in ('LLM', 'Image', 'Video', 'Audio', 'Code', 'Search')),
  tagline text not null check (char_length(tagline) between 1 and 200),
  hosting text not null check (hosting in ('CH', 'EU', 'US')),
  pricing text not null check (char_length(pricing) between 1 and 40),
  url text check (url is null or url ~ '^https://'),
  featured boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  locked boolean not null default false,
  source text not null default 'seed' check (source in ('seed', 'ai', 'editor')),
  ai_note text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_platforms_set_updated_at
  before update on public.ai_platforms
  for each row execute function public.set_updated_at();

create table public.ai_job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (job in ('platform_research', 'prompt_generation')),
  trigger text not null default 'cron' check (trigger in ('cron', 'manual')),
  status text not null default 'running' check (status in ('running', 'ok', 'partial', 'error')),
  summary jsonb not null default '{}'::jsonb,
  errors text[] not null default '{}',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index ai_job_runs_job_started_idx on public.ai_job_runs (job, started_at desc);

create table public.ai_platform_changes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ai_job_runs(id) on delete set null,
  platform_id uuid references public.ai_platforms(id) on delete set null,
  action text not null check (action in ('add', 'update', 'archive')),
  before jsonb,
  after jsonb,
  reason text,
  sources text[] not null default '{}',
  reverted_at timestamptz,
  created_at timestamptz not null default now()
);

create index ai_platform_changes_created_idx on public.ai_platform_changes (created_at desc);

alter table public.ai_platforms enable row level security;
alter table public.ai_job_runs enable row level security;
alter table public.ai_platform_changes enable row level security;

create policy "ai_platforms_public_read" on public.ai_platforms
  for select to anon, authenticated using (status = 'active');
create policy "ai_platforms_editor_all" on public.ai_platforms
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "ai_job_runs_editor_select" on public.ai_job_runs
  for select to authenticated using (public.is_editor());
create policy "ai_platform_changes_editor_select" on public.ai_platform_changes
  for select to authenticated using (public.is_editor());
create policy "ai_platform_changes_editor_update" on public.ai_platform_changes
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

revoke all on public.ai_job_runs from anon;
revoke all on public.ai_platform_changes from anon;
revoke insert, update, delete on public.ai_platforms from anon;

-- Startbestand: die 14 Plattformen aus dem Code (Texte auf Deutsch).
insert into public.ai_platforms (slug, name, category, tagline, hosting, pricing, url, featured) values
  ('claude', 'Claude', 'LLM', 'Der KI-Assistent von Anthropic: stark im Schreiben, Analysieren und Programmieren.', 'US', 'Gratis + Pro', 'https://claude.ai', true),
  ('chatgpt', 'ChatGPT', 'LLM', 'Der Chat-Assistent von OpenAI mit Bild-, Sprach- und Dateifunktionen.', 'US', 'Gratis + Plus', 'https://chatgpt.com', true),
  ('swiss-gpt', 'Swiss GPT', 'LLM', 'In der Schweiz gehostetes Sprachmodell für Unternehmen, datenschutzkonform.', 'CH', 'Enterprise', null, true),
  ('midjourney', 'Midjourney', 'Image', 'KI-Bildgenerierung mit sehr hoher Bildqualität.', 'US', 'Bezahlt', 'https://midjourney.com', false),
  ('dall-e-3', 'DALL-E 3', 'Image', 'Bildmodell von OpenAI, direkt in ChatGPT nutzbar.', 'US', 'Pro Nutzung', 'https://openai.com/dall-e-3', false),
  ('elevenlabs', 'ElevenLabs', 'Audio', 'Realistische KI-Stimmen in vielen Sprachen.', 'US', 'Gratis + Bezahlt', 'https://elevenlabs.io', false),
  ('runway', 'Runway', 'Video', 'KI-Videogenerierung und -bearbeitung für Kreative.', 'US', 'Gratis + Bezahlt', 'https://runwayml.com', false),
  ('github-copilot', 'GitHub Copilot', 'Code', 'KI-Programmierhilfe direkt im Editor.', 'US', 'Bezahlt', 'https://github.com/features/copilot', false),
  ('cursor', 'Cursor', 'Code', 'Code-Editor, der von Grund auf um KI gebaut ist.', 'US', 'Gratis + Pro', 'https://cursor.com', false),
  ('mistral-ai', 'Mistral AI', 'LLM', 'Europäische Sprachmodelle, teils mit offenen Gewichten.', 'EU', 'Gratis + API', 'https://mistral.ai', false),
  ('perplexity', 'Perplexity', 'Search', 'KI-Suchmaschine mit Quellenangaben und aktuellen Daten.', 'US', 'Gratis + Pro', 'https://perplexity.ai', false),
  ('suno', 'Suno', 'Audio', 'Komplette Songs aus einer Textbeschreibung erzeugen.', 'US', 'Gratis + Bezahlt', 'https://suno.com', false),
  ('gemini', 'Gemini', 'LLM', 'Multimodales KI-Modell von Google mit Deep Research.', 'US', 'Gratis + Pro', 'https://gemini.google.com', false),
  ('stable-diffusion', 'Stable Diffusion', 'Image', 'Open-Source-Bildgenerierung, lokal oder in der Cloud.', 'EU', 'Gratis / Open Source', 'https://stability.ai', false);

alter table public.ai_prompts
  add column ai_generated boolean not null default false;

comment on column public.ai_prompts.ai_generated is
  'true = von der KI-Redaktion erstellt (woechentlicher Job prompt_generation), auf Karte und Detailseite gekennzeichnet.';

grant select (ai_generated) on public.ai_prompts to anon;

-- Rollback (auskommentiert, nur als Doku):
-- alter table public.ai_prompts drop column if exists ai_generated;
-- drop table if exists public.ai_platform_changes;
-- drop table if exists public.ai_job_runs;
-- drop table if exists public.ai_platforms;
