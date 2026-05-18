-- Phase 11 — AI-Konfiguration (A1b-0).
--
-- Singleton-Tabelle mit genau einer Row (id = 'global'), die einen
-- globalen Systemprompt + ein globales Default-Modell + optionale
-- Modell-Overrides pro Task hält. Editor-Rolle pflegt die Row via UI,
-- callLLM liest sie zur Laufzeit (kein Cache, frisch pro Call).
--
-- RLS-Pattern: jeder eingeloggte Author darf lesen (Config-Resolver
-- nutzt die bestehende Auth-Session); INSERT/UPDATE nur Editor via
-- public.is_editor()-Helper (definiert in
-- 20260511220724_storage_avatars_bucket.sql). Keine DELETE-Policy —
-- der Singleton ist nicht löschbar.

create table public.ai_config (
  id text primary key default 'global'
    check (id = 'global'),
  system_prompt text not null default '',
  default_model text not null,
  task_model_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.authors(id) on delete set null
);

alter table public.ai_config enable row level security;

-- SELECT: jeder eingeloggte Author. Der Config-Resolver in callLLM nutzt
-- den bestehenden Auth-Server-Client, nicht den Service-Role-Client.
create policy "ai_config_select_authenticated"
  on public.ai_config
  for select to authenticated
  using (true);

-- INSERT: nur Editor. Wird in der Praxis nur durch den Singleton-Seed
-- unten + (theoretisch) einen Editor-getriggerten Re-Insert verwendet.
create policy "ai_config_insert_editor"
  on public.ai_config
  for insert to authenticated
  with check (public.is_editor());

-- UPDATE: nur Editor.
create policy "ai_config_update_editor"
  on public.ai_config
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- KEINE DELETE-Policy: Singleton soll nicht löschbar sein.

-- Seed-Row: genau eine Row, idempotent gegen Re-Run via on conflict.
-- default_model ist hier auf den aktuellen ANTHROPIC_MODEL-Stand
-- ('claude-haiku-4-5') gesetzt — der Editor überschreibt diesen Wert
-- nach Deploy über die UI /autor/admin/ai-config.
insert into public.ai_config (id, system_prompt, default_model, task_model_overrides)
values ('global', '', 'claude-haiku-4-5', '{}'::jsonb)
on conflict (id) do nothing;

-- ROLLBACK (auskommentiert, nur als Doku):
-- drop policy if exists "ai_config_update_editor" on public.ai_config;
-- drop policy if exists "ai_config_insert_editor" on public.ai_config;
-- drop policy if exists "ai_config_select_authenticated" on public.ai_config;
-- drop table if exists public.ai_config;
