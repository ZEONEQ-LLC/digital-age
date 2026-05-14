-- Phase T1 — Tag-System Foundation.
--
-- `tags` ist die Master-Liste mit URL-Slug (lowercase) + Display-Name.
-- `article_tags` ist die m:n-Junction zwischen articles und tags.
--
-- Die bestehende `articles.tags text[]`-Spalte bleibt vorerst erhalten
-- (Backwards-Compat). Wird in einem späteren Cleanup-PR entfernt, sobald
-- T2 und T3 produktiv sind.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tags_slug_idx on public.tags (slug);
create index tags_name_idx on public.tags (name);

create table public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create index article_tags_tag_id_idx on public.article_tags (tag_id);
create index article_tags_article_id_idx on public.article_tags (article_id);

-- RLS
alter table public.tags enable row level security;
alter table public.article_tags enable row level security;

-- tags: alle lesen, Author + Editor schreiben.
-- Author kann neue Tags anlegen (über den Editor-Save-Flow), darum auch
-- INSERT für non-editor authors. UPDATE/DELETE bleibt Editor-only — Renamen
-- und Löschen ist Admin-Bereich (kommt in T3).
create policy "tags_public_read" on public.tags
  for select using (true);

create policy "tags_author_insert" on public.tags
  for insert to authenticated
  with check (
    exists (
      select 1 from public.authors
      where user_id = auth.uid()
        and role in ('author', 'editor')
    )
  );

create policy "tags_editor_update" on public.tags
  for update to authenticated
  using (
    exists (
      select 1 from public.authors
      where user_id = auth.uid() and role = 'editor'
    )
  )
  with check (
    exists (
      select 1 from public.authors
      where user_id = auth.uid() and role = 'editor'
    )
  );

create policy "tags_editor_delete" on public.tags
  for delete to authenticated
  using (
    exists (
      select 1 from public.authors
      where user_id = auth.uid() and role = 'editor'
    )
  );

-- article_tags: alle lesen, Author kann Junctions für eigene Artikel
-- anlegen/löschen, Editor kann alle.
create policy "article_tags_public_read" on public.article_tags
  for select using (true);

create policy "article_tags_author_write" on public.article_tags
  for insert to authenticated
  with check (
    article_id in (
      select id from public.articles
      where author_id in (
        select id from public.authors where user_id = auth.uid()
      )
    )
  );

create policy "article_tags_author_delete" on public.article_tags
  for delete to authenticated
  using (
    article_id in (
      select id from public.articles
      where author_id in (
        select id from public.authors where user_id = auth.uid()
      )
    )
  );

create policy "article_tags_editor_all" on public.article_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.authors
      where user_id = auth.uid() and role = 'editor'
    )
  )
  with check (
    exists (
      select 1 from public.authors
      where user_id = auth.uid() and role = 'editor'
    )
  );
