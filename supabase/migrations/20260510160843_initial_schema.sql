-- Phase 7 Session A — Initial schema
-- 5 tables (categories, authors, articles, revisions, podcasts)
-- 2 enums (author_role, article_status)
-- RLS active on all tables, public-read policies for lookup + published content

-- =========================================================================
-- categories
-- =========================================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_de text not null,
  name_en text,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_categories_display_order on categories(display_order);

insert into categories (slug, name_de, name_en, display_order) values
  ('ki-business', 'KI & Business', 'AI & Business', 10),
  ('future-tech', 'Future Tech',   'Future Tech',   20),
  ('swiss-ai',    'Swiss AI',      'Swiss AI',      30),
  ('tools',       'Tools',         'Tools',         40);
-- TODO Session B+: weitere Kategorien je nach Site-Wachstum

-- =========================================================================
-- authors (Three-Role-Modell)
-- =========================================================================
create type author_role as enum ('external', 'author', 'editor');

create table authors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  slug text unique not null,
  display_name text not null,
  email text not null unique,
  role author_role not null default 'external',
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_authors_role on authors(role);
create index idx_authors_user_id on authors(user_id);

-- =========================================================================
-- articles
-- =========================================================================
create type article_status as enum ('draft', 'in_review', 'published', 'archived');

create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  category_id uuid not null references categories(id) on delete restrict,
  status article_status not null default 'draft',
  author_id uuid not null references authors(id) on delete restrict,
  cover_image_url text,
  excerpt text,
  body_md text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_articles_status on articles(status);
create index idx_articles_category_id on articles(category_id);
create index idx_articles_published_at on articles(published_at desc);
create index idx_articles_author_id on articles(author_id);

-- =========================================================================
-- revisions (Audit-Trail mit Title- und Body-Snapshot)
-- =========================================================================
create table revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  editor_id uuid references authors(id) on delete set null,
  previous_status article_status,
  new_status article_status not null,
  title_snapshot text not null,
  body_md_snapshot text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_revisions_article_id on revisions(article_id);
create index idx_revisions_created_at on revisions(created_at desc);

-- =========================================================================
-- podcasts
-- =========================================================================
create table podcasts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  audio_url text not null,
  cover_image_url text,
  duration_seconds integer,
  episode_number integer,
  host_id uuid references authors(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_podcasts_published_at on podcasts(published_at desc);
create index idx_podcasts_episode_number on podcasts(episode_number);

-- =========================================================================
-- updated_at trigger (DRY)
-- =========================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_authors_updated_at before update on authors
  for each row execute function set_updated_at();
create trigger trg_articles_updated_at before update on articles
  for each row execute function set_updated_at();
create trigger trg_podcasts_updated_at before update on podcasts
  for each row execute function set_updated_at();

-- =========================================================================
-- RLS — restrictive default, public-read for lookup + published content
-- TODO Session B/C: policies for authenticated authors (own drafts, editor full access)
-- =========================================================================
alter table categories enable row level security;
alter table authors    enable row level security;
alter table articles   enable row level security;
alter table revisions  enable row level security;
alter table podcasts   enable row level security;

create policy "public can read categories" on categories
  for select using (true);

create policy "public can read author profiles" on authors
  for select using (true);

create policy "public can read published articles" on articles
  for select using (status = 'published');

create policy "public can read podcasts with published_at" on podcasts
  for select using (published_at is not null);

-- revisions: kein public read — Audit-Trail bleibt intern
