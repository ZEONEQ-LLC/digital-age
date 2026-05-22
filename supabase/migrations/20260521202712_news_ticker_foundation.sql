-- AI News Ticker Foundation — Phase 1.
--
-- Drei Tabellen: news_sources (Editor-pflegbare Feed-Liste),
-- news_items (LLM-generierte Public-Ticker-Einträge, befüllt erst in
-- Phase 2), news_ticker_config (Singleton mit Generation-Prompt +
-- Refresh-Statistik). Kein Fetcher, kein LLM-Call in dieser Phase.

-- =========================================================================
-- 1. news_sources
-- =========================================================================
create table public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique
    check (url ~* '^https?://'),
  source_type text not null default 'rss'
    check (source_type in ('rss', 'atom', 'html')),
  language text not null default 'de'
    check (language in ('de', 'en', 'fr', 'it')),
  country text
    check (country is null or country in ('CH', 'DE', 'AT', 'INT')),
  default_category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_news_sources_updated_at before update on public.news_sources
  for each row execute function public.set_updated_at();

alter table public.news_sources enable row level security;

-- Editor-only Full-Access. Anon hat KEINEN Lesezugriff auf Quellen-Liste
-- (Wettbewerbs-Schutz; die Quellen-Konfiguration ist interne Information).
create policy "news_sources_editor_all"
  on public.news_sources
  for all
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- =========================================================================
-- 2. news_items
-- =========================================================================
create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.news_sources(id) on delete cascade,
  source_url text not null unique,
  original_title text not null,
  title text not null,
  teaser text not null,
  summary text not null,
  category text,
  published_at timestamptz not null,
  generated_at timestamptz not null default now(),
  status text not null default 'approved'
    check (status in ('approved', 'rejected', 'draft'))
);

-- Public-Render in Phase 2 sortiert nach published_at desc — Index dafür.
create index idx_news_items_published_at on public.news_items (published_at desc);
create index idx_news_items_source_id on public.news_items (source_id);

alter table public.news_items enable row level security;

-- Public-Read: nur approved Items. anon + authenticated.
create policy "news_items_public_read_approved"
  on public.news_items
  for select
  using (status = 'approved');

-- Editor-only Full-Access (für Phase-2-Insert/Update + Admin-Aussortieren).
create policy "news_items_editor_all"
  on public.news_items
  for all
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- =========================================================================
-- 3. news_ticker_config (Singleton)
-- =========================================================================
create table public.news_ticker_config (
  id integer primary key default 1 check (id = 1),
  generation_prompt text not null,
  last_refresh_at timestamptz,
  last_refresh_stats jsonb,
  updated_at timestamptz not null default now()
);

create trigger trg_news_ticker_config_updated_at before update on public.news_ticker_config
  for each row execute function public.set_updated_at();

alter table public.news_ticker_config enable row level security;

-- Editor SELECT + UPDATE. KEIN INSERT/DELETE (Singleton soll nicht
-- löschbar/duplizierbar sein); CHECK auf id=1 plus fehlende INSERT-Policy
-- enforced das doppelt.
create policy "news_ticker_config_select_editor"
  on public.news_ticker_config
  for select
  to authenticated
  using (public.is_editor());

create policy "news_ticker_config_update_editor"
  on public.news_ticker_config
  for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- Seed der Singleton-Row mit Default-Generation-Prompt.
-- Hinweis: das `--` direkt nach 'rss-feed' in der Prompt-Multiline würde im
-- SQL als Kommentar interpretiert — daher hier bewusst kein Markdown-
-- Kommentar-Pattern im Prompt-Text.
insert into public.news_ticker_config (id, generation_prompt)
values (
  1,
  $$Du bist Redakteur für ein deutschsprachiges KI-Magazin (Schweiz). Aus dem folgenden RSS-Feed-Item erstelle:

1. title: Deutsche Schlagzeile, max 80 Zeichen, prägnant
2. teaser: 1 Satz für Ticker-Bar, max 120 Zeichen
3. summary: 2-3 Sätze für Modal-Anzeige, max 400 Zeichen
4. category: eine von 'ki-business' | 'future-tech' | 'swiss-ai' | 'tools' | null falls nicht eindeutig

SPRACHE: Immer Deutsch mit Schweizer Rechtschreibung. Niemals Eszett — IMMER 'ss'. Wenn Original auf Englisch: übersetzen. Wenn auf Deutsch: prüfen ob Eszett vorhanden und durch ss ersetzen.

STIL: Sachlich, magazin-tauglich, kein Clickbait. Keine Übertreibungen, keine Floskeln.

OUTPUT: NUR ein JSON-Objekt, kein Markdown-Codeblock, keine Vor- oder Nachrede. Schema:
{
  "title": string,
  "teaser": string,
  "summary": string,
  "category": string | null
}

FILTER: Wenn das Item nicht zu KI/Tech passt (z.B. allgemeine Politik, Sport, Werbung), antworte mit dem JSON {"skip": true} und nichts anderes. Nur tatsächlich relevante KI/Tech-News durchlassen.$$
)
on conflict (id) do nothing;

-- ROLLBACK (auskommentiert, nur als Doku):
-- drop policy if exists "news_ticker_config_update_editor" on public.news_ticker_config;
-- drop policy if exists "news_ticker_config_select_editor" on public.news_ticker_config;
-- drop table if exists public.news_ticker_config;
-- drop policy if exists "news_items_editor_all" on public.news_items;
-- drop policy if exists "news_items_public_read_approved" on public.news_items;
-- drop index if exists idx_news_items_source_id;
-- drop index if exists idx_news_items_published_at;
-- drop table if exists public.news_items;
-- drop policy if exists "news_sources_editor_all" on public.news_sources;
-- drop trigger if exists trg_news_sources_updated_at on public.news_sources;
-- drop table if exists public.news_sources;
