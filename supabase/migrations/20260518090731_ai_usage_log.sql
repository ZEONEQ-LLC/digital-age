-- Phase 11 — AI-Infrastruktur (A1a).
--
-- Kombinierte Rate-Limit- + Kosten-Tabelle für AI-Calls. Die Zeilen dienen
-- gleichzeitig:
--   (a) als Sliding-Window-Zähler für `checkAiRateLimit` (Filter auf
--       created_at innerhalb der letzten Stunde),
--   (b) als persistenter Kosten-Hauptbuch (input/output-Tokens pro Author).
--
-- BEWUSST kein 24h-Auto-Cleanup (anders als `newsletter_signup_attempts`),
-- weil die Kostenhistorie erhalten bleiben muss. Optionaler Long-Term-
-- Cleanup für >365 Tage alte Zeilen wäre theoretisch denkbar — wird hier
-- absichtlich NICHT aktiv eingebaut, nur als Idee dokumentiert. Solange
-- Volumen klein bleibt, ist Vollarchiv sauberer.
--
-- RLS: keine anon/authenticated-Policy. Nur die Service-Role-API darf
-- lesen/schreiben (Server-Action-Kontext mit Service-Client). Damit ist
-- der Log immun gegen Client-Manipulation.

create table public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.authors(id) on delete restrict,
  task text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

-- Hot-Path-Index für das Rate-Limit-Window-Query
-- (author_id + created_at descending).
create index ai_usage_log_author_time_idx
  on public.ai_usage_log (author_id, created_at desc);

alter table public.ai_usage_log enable row level security;

-- Keine Policies — Tabelle ist nur via Service-Role zugänglich.

-- ROLLBACK (auskommentiert — manuell ausführen falls nötig):
-- drop index if exists public.ai_usage_log_author_time_idx;
-- drop table if exists public.ai_usage_log;
