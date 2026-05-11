-- Phase 7 Session D — Podcasts Schema Refactor
--
-- Altes Modell: "Host produziert Episoden" (slug, audio_url, episode_number, host_id).
-- Neues Modell: kuratierte Empfehlungen externer Podcasts/Episoden — Empfehlung
-- kann eine ganze Show oder eine einzelne Episode sein, Schema ist agnostisch.
--
-- Vorhandene Tabelle wird gedropped (keine produktiven Daten drin), Neuanlage.

drop table if exists public.podcasts cascade;

create table public.podcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_image_url text,
  language text not null check (language in ('de', 'en', 'fr', 'it')),
  podcast_category text not null,
  spotify_url text,
  apple_podcasts_url text,
  recommended_by_id uuid references public.authors(id) on delete set null,
  recommended_at timestamptz not null default now(),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index podcasts_published_idx on public.podcasts(is_published, recommended_at desc);
create index podcasts_language_idx on public.podcasts(language);
create index podcasts_category_idx on public.podcasts(podcast_category);
create index podcasts_recommender_idx on public.podcasts(recommended_by_id);

create trigger podcasts_set_updated_at
  before update on public.podcasts
  for each row execute function public.set_updated_at();

alter table public.podcasts enable row level security;

-- Public: read published podcasts
create policy "podcasts_public_read_published"
  on public.podcasts for select
  using (is_published = true);

-- Authors: read own (published or not)
create policy "podcasts_author_read_own"
  on public.podcasts for select
  to authenticated
  using (
    recommended_by_id in (
      select id from public.authors where user_id = auth.uid()
    )
  );

-- Authors: insert own
create policy "podcasts_author_insert_own"
  on public.podcasts for insert
  to authenticated
  with check (
    recommended_by_id in (
      select id from public.authors where user_id = auth.uid()
    )
  );

-- Authors: update own
create policy "podcasts_author_update_own"
  on public.podcasts for update
  to authenticated
  using (
    recommended_by_id in (
      select id from public.authors where user_id = auth.uid()
    )
  )
  with check (
    recommended_by_id in (
      select id from public.authors where user_id = auth.uid()
    )
  );

-- Authors: delete own
create policy "podcasts_author_delete_own"
  on public.podcasts for delete
  to authenticated
  using (
    recommended_by_id in (
      select id from public.authors where user_id = auth.uid()
    )
  );

-- Editors: full access on all
create policy "podcasts_editor_all"
  on public.podcasts for all
  to authenticated
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
