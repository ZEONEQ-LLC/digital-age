-- Modell-Check (PR 192): Katalog der Claude-Modelle mit Preisen und Status,
-- Protokoll der Prüfläufe, Lesezugriff der Editoren auf das KI-Kostenlog.
-- Additiv. Lesen und Preise pflegen: Editoren (Admin-Seite
-- /autor/admin/ai-config/modell-check). Schreiben der Läufe und Abgleich mit
-- der Models API: Service-Role (Cron /api/cron/model-check, «Jetzt prüfen»).

create table public.ai_model_catalog (
  model_id text primary key,
  label text not null default '',
  model_class text not null default 'other'
    check (model_class in ('haiku', 'sonnet', 'opus', 'fable', 'other')),
  -- USD pro Million Tokens; null = Preis fehlt (Models API liefert keine Preise).
  input_usd_per_mtok numeric(10, 4) check (input_usd_per_mtok >= 0),
  output_usd_per_mtok numeric(10, 4) check (output_usd_per_mtok >= 0),
  -- Preisstufe für lange Prompts (Haiku 5.5: ab 100 000 Prompt-Tokens).
  long_prompt_threshold integer check (long_prompt_threshold > 0),
  input_usd_per_mtok_long numeric(10, 4) check (input_usd_per_mtok_long >= 0),
  output_usd_per_mtok_long numeric(10, 4) check (output_usd_per_mtok_long >= 0),
  status text not null default 'active'
    check (status in ('active', 'deprecated', 'retired')),
  retirement_date date,
  replacement_model_id text,
  released_at date,
  vision boolean,
  source text not null default '',
  checked_at date,
  seen_in_api_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_model_catalog_set_updated_at
  before update on public.ai_model_catalog
  for each row execute function public.set_updated_at();

alter table public.ai_model_catalog enable row level security;

create policy "ai_model_catalog_select_editor" on public.ai_model_catalog
  for select to authenticated using (is_editor());
create policy "ai_model_catalog_update_editor" on public.ai_model_catalog
  for update to authenticated using (is_editor()) with check (is_editor());

create table public.ai_model_check_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  trigger text not null check (trigger in ('cron', 'manual')),
  -- Empfehlungen und Hinweise des Laufs ({key, message, ...}).
  items jsonb not null default '[]'::jsonb,
  -- Fehler (Models API, DB); laut im Admin und in der Mail.
  errors jsonb not null default '[]'::jsonb,
  models_seen text[] not null default '{}',
  notified boolean not null default false
);

create index ai_model_check_runs_ran_at_idx on public.ai_model_check_runs (ran_at desc);

alter table public.ai_model_check_runs enable row level security;

create policy "ai_model_check_runs_select_editor" on public.ai_model_check_runs
  for select to authenticated using (is_editor());

-- Kostenlog: Editoren dürfen lesen (Modell-Check-Seite). Schreiben weiter nur
-- per Service-Role (rateLimit.ts).
create policy "ai_usage_log_select_editor" on public.ai_usage_log
  for select to authenticated using (is_editor());

-- Startbestand laut Anthropic-Preisseite und Abkündigungsseite, Stand
-- 11.11.2026. Alle aktiv. released_at grob (Abschaltung frühestens ein Jahr
-- nach Erscheinen), der erste Lauf überschreibt es mit created_at aus der
-- Models API. claude-haiku-4-5 ist der Alias aus dem Kostenlog (API-ID mit
-- Datum: claude-haiku-4-5-20251001). Fable 5.2 steht in der Modellübersicht,
-- aber nicht auf der Preisseite: Preis fehlt.
insert into public.ai_model_catalog
  (model_id, label, model_class, input_usd_per_mtok, output_usd_per_mtok,
   long_prompt_threshold, input_usd_per_mtok_long, output_usd_per_mtok_long,
   released_at, vision, source, checked_at)
values
  ('claude-haiku-5-5',  'Claude Haiku 5.5',  'haiku',  0.10,  0.50, 100000, 0.50, 2.50, '2026-10-07', true, 'Anthropic-Preisseite', '2026-11-11'),
  ('claude-sonnet-5-5', 'Claude Sonnet 5.5', 'sonnet', 2.00, 10.00, null, null, null, '2026-09-28', true, 'Anthropic-Preisseite', '2026-11-11'),
  ('claude-opus-5-5',   'Claude Opus 5.5',   'opus',   4.00, 20.00, null, null, null, '2026-09-22', true, 'Anthropic-Preisseite', '2026-11-11'),
  ('claude-fable-5-2',  'Claude Fable 5.2',  'fable',  null,  null, null, null, null, null,         null, 'Modellübersicht, Preis nicht auf der Preisseite', '2026-11-11'),
  ('claude-fable-5-1',  'Claude Fable 5.1',  'fable', 10.00, 50.00, null, null, null, '2026-09-01', true, 'Anthropic-Preisseite', '2026-11-11'),
  ('claude-fable-5',    'Claude Fable 5',    'fable', 10.00, 50.00, null, null, null, '2026-06-09', true, 'Anthropic-Preisseite', '2026-11-11'),
  ('claude-opus-4-8',   'Claude Opus 4.8',   'opus',   5.00, 25.00, null, null, null, '2026-05-28', true, 'Anthropic-Preisseite', '2026-11-11'),
  ('claude-opus-4-7',   'Claude Opus 4.7',   'opus',   5.00, 25.00, null, null, null, '2026-04-16', true, 'Anthropic-Preisseite', '2026-11-11'),
  ('claude-opus-4-6',   'Claude Opus 4.6',   'opus',   5.00, 25.00, null, null, null, '2026-02-05', true, 'Anthropic-Preisseite', '2026-11-11'),
  ('claude-sonnet-5',   'Claude Sonnet 5',   'sonnet', 2.00, 10.00, null, null, null, '2026-06-30', true, 'Anthropic-Preisseite (Einführungspreis gilt dauerhaft)', '2026-11-11'),
  ('claude-sonnet-4-6', 'Claude Sonnet 4.6', 'sonnet', 3.00, 15.00, null, null, null, '2026-02-17', true, 'Anthropic-Preisseite', '2026-11-11'),
  ('claude-haiku-4-5',  'Claude Haiku 4.5',  'haiku',  1.00,  5.00, null, null, null, '2025-10-15', true, 'Anthropic-Preisseite', '2026-11-11');
