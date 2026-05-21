-- Pages-System: eigene Tabelle für editorpflegbare statische Seiten
-- (Über uns, Redaktion, KI-Transparenz, Community-Richtlinien, Impressum,
-- Datenschutzerklärung). Public-Routen lesen über `slug`, Editor pflegt
-- über UI unter /autor/seiten.
--
-- body_blocks-Schema ist identisch zu articles.body_blocks, damit
-- BlockReader + BlockEditor wiederverwendet werden können.

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9-]+$' and length(slug) <= 80),
  title text not null,
  lead text,
  body_blocks jsonb not null default
    '{"version": 1, "blocks": [], "sources": []}'::jsonb,
  meta_description text,
  -- Rechtliche/redaktionelle Seiten standardmässig nicht indexieren;
  -- Editor toggled bei Bedarf um.
  noindex boolean not null default true,
  locale text not null default 'de-CH'
    check (locale in ('de-CH', 'en')),
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  hero_category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lookup-Index, da Public-Routes per slug abfragen. UNIQUE-Constraint
-- erzeugt bereits einen Index, das hier ist redundant — bewusst weg-
-- gelassen.

-- updated_at auto-bump (gleicher set_updated_at()-Trigger wie articles).
create trigger trg_pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

alter table public.pages enable row level security;

-- Public-Read: anon + authenticated lesen nur published. RLS-Pattern
-- analog zu `public can read published articles` aus dem Initial-Schema.
create policy "pages_public_read_published"
  on public.pages
  for select
  using (status = 'published');

-- Editor-only Full-Access. is_editor()-Helper ist seit der
-- avatars-Bucket-Migration definiert und wird von ai_config, tags,
-- newsletter etc. genutzt — gleiches Pattern.
create policy "pages_editor_all"
  on public.pages
  for all
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- ROLLBACK (auskommentiert, nur als Doku):
-- drop policy if exists "pages_editor_all" on public.pages;
-- drop policy if exists "pages_public_read_published" on public.pages;
-- drop trigger if exists trg_pages_updated_at on public.pages;
-- drop table if exists public.pages;
