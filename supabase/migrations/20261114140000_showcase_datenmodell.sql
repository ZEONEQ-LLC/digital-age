-- Showcase S2a: Datenmodell fuer Unternehmensbeitraege. Auf der Website ist
-- davon noch nichts zu sehen; die Seiten folgen mit S2b.
--
--   * articles.content_type: 'editorial' (Standard) oder 'company'.
--   * articles.startup_id: das Unternehmen aus dem Verzeichnis, Pflicht bei
--     'company', sonst leer.
--   * articles.is_paid: bezahlter Beitrag (Kennzeichnung «Publireportage»),
--     nur bei 'company'.
--   * Kategorie «showcase»: Unternehmensbeitraege liegen immer dort. So bleibt
--     category_id NOT NULL, und alle Abfragen nach Rubrik schliessen sie von
--     selbst aus. Die Kategorie steht nicht in der Navigation.
--   * Trigger articles_guard_content_type: Nur die Redaktion aendert die
--     Einordnung (Autor:innen duerfen ihre Entwuerfe sonst frei bearbeiten).
--     Ein Unternehmensbeitrag liegt immer in «showcase», ein redaktioneller
--     Artikel nie.
--   * Revisionen: Der Snapshot haelt die Einordnung fest (Nachvollziehbarkeit),
--     ein Wechsel erzeugt eine Revision. Ein Restore aendert die Einordnung
--     nie. Sonst wuerde ein alter Stand einen Unternehmensbeitrag still wieder
--     zum redaktionellen Artikel machen.
--
-- Additiv: neue Spalten mit Default, neue Kategorie-Zeile, Funktionen als
-- Obermenge der bisherigen.

alter table public.articles
  add column if not exists content_type text not null default 'editorial',
  add column if not exists startup_id uuid references public.ai_startups(id) on delete restrict,
  add column if not exists is_paid boolean not null default false;

alter table public.articles drop constraint if exists articles_content_type_check;
alter table public.articles add constraint articles_content_type_check
  check (content_type in ('editorial', 'company'));

alter table public.articles drop constraint if exists articles_company_needs_startup;
alter table public.articles add constraint articles_company_needs_startup
  check ((content_type = 'company') = (startup_id is not null));

alter table public.articles drop constraint if exists articles_paid_only_company;
alter table public.articles add constraint articles_paid_only_company
  check (is_paid = false or content_type = 'company');

-- Aufmacher und Featured sind redaktionelle Plaetze.
alter table public.articles drop constraint if exists articles_company_not_featured;
alter table public.articles add constraint articles_company_not_featured
  check (content_type = 'editorial' or (is_featured = false and is_hero = false));

create index if not exists articles_startup_id_idx
  on public.articles (startup_id) where startup_id is not null;

comment on column public.articles.content_type is
  'editorial = redaktioneller Artikel, company = Unternehmensbeitrag im Showcase. Aendert nur die Redaktion (Trigger articles_guard_content_type).';
comment on column public.articles.startup_id is
  'Unternehmen aus ai_startups, Pflicht bei content_type = company.';
comment on column public.articles.is_paid is
  'Bezahlter Unternehmensbeitrag (Kennzeichnung Publireportage). Nur bei content_type = company.';

insert into public.categories (slug, name_de, name_en, description, display_order)
select 'showcase', 'Showcase', 'Showcase',
       'Unternehmensbeiträge. Nicht in der Navigation und nicht in redaktionellen Listen.', 90
where not exists (select 1 from public.categories where slug = 'showcase');

-- Einordnung schuetzen und Kategorie konsistent halten.
create or replace function public.articles_guard_content_type()
returns trigger
language plpgsql
set search_path to 'public'
as $fn$
declare
  v_showcase uuid;
  v_changed boolean;
begin
  if tg_op = 'INSERT' then
    v_changed := new.content_type <> 'editorial' or new.startup_id is not null or new.is_paid;
  else
    v_changed :=
         old.content_type is distinct from new.content_type
      or old.startup_id   is distinct from new.startup_id
      or old.is_paid      is distinct from new.is_paid;
  end if;

  -- Ohne Login (Service-Role, Migration) gibt es kein auth.uid(): erlaubt.
  if v_changed and auth.uid() is not null and not exists (
    select 1 from public.authors where user_id = auth.uid() and role = 'editor'
  ) then
    raise exception 'content_type_editor_only' using errcode = '42501';
  end if;

  select id into v_showcase from public.categories where slug = 'showcase';

  if new.content_type = 'company' then
    if v_showcase is null then
      raise exception 'showcase_category_missing' using errcode = '23514';
    end if;
    new.category_id := v_showcase;
  elsif new.category_id = v_showcase then
    raise exception 'showcase_category_reserved' using errcode = '23514';
  end if;

  return new;
end;
$fn$;

-- Trigger-Funktion: nicht per RPC aufrufbar (Muster 20261111210000).
revoke execute on function public.articles_guard_content_type() from public, anon, authenticated;

-- Der Name sortiert vor articles_revision_on_update: Die Revision sieht so
-- schon die korrigierte Kategorie.
drop trigger if exists articles_guard_content_type on public.articles;
create trigger articles_guard_content_type
  before insert or update on public.articles
  for each row execute function public.articles_guard_content_type();

-- Snapshot: bisherige Felder plus Einordnung.
create or replace function public.article_editorial_snapshot(a articles)
returns jsonb
language sql
immutable
set search_path to 'public'
as $fn$
  select jsonb_build_object(
    'title', a.title,
    'subtitle', a.subtitle,
    'body_blocks', a.body_blocks,
    'body_md', a.body_md,
    'excerpt', a.excerpt,
    'cover_image_url', a.cover_image_url,
    'cover_image_alt', a.cover_image_alt,
    'cover_image_caption', a.cover_image_caption,
    'cover_image_source', a.cover_image_source,
    'og_image_url', a.og_image_url,
    'cover_video_url', a.cover_video_url,
    'cover_video_alt', a.cover_video_alt,
    'cover_recipe', a.cover_recipe,
    'category_id', a.category_id,
    'subcategory', a.subcategory,
    'tags', to_jsonb(a.tags),
    'locale', a.locale,
    'seo_title', a.seo_title,
    'seo_description', a.seo_description,
    'seo_keyword_primary', a.seo_keyword_primary,
    'seo_keywords_secondary', to_jsonb(a.seo_keywords_secondary),
    'slug', a.slug,
    'content_type', a.content_type,
    'startup_id', a.startup_id,
    'is_paid', a.is_paid
  );
$fn$;

create or replace function public.create_article_revision()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_editor_id uuid;
  v_content_changed boolean;
  v_status_changed boolean;
begin
  -- Waehrend eines Restores schreibt die RPC ihren eigenen 'restore'-Eintrag.
  if coalesce(current_setting('app.skip_revision', true), '') = 'on' then
    return new;
  end if;

  -- cover_proposals steht bewusst NICHT in dieser Liste (KI-Zwischenspeicher,
  -- keine redaktionelle Aenderung, wie copilot_last_run).
  -- content_type, startup_id und is_paid stehen drin: Ein Wechsel der
  -- Einordnung soll in der Timeline nachvollziehbar sein.
  v_content_changed :=
       old.title                  is distinct from new.title
    or old.subtitle               is distinct from new.subtitle
    or old.body_blocks            is distinct from new.body_blocks
    or old.body_md                is distinct from new.body_md
    or old.excerpt                is distinct from new.excerpt
    or old.cover_image_url        is distinct from new.cover_image_url
    or old.cover_image_alt        is distinct from new.cover_image_alt
    or old.cover_image_caption    is distinct from new.cover_image_caption
    or old.cover_image_source     is distinct from new.cover_image_source
    or old.og_image_url           is distinct from new.og_image_url
    or old.cover_video_url        is distinct from new.cover_video_url
    or old.cover_video_alt        is distinct from new.cover_video_alt
    or old.cover_recipe           is distinct from new.cover_recipe
    or old.category_id            is distinct from new.category_id
    or old.subcategory            is distinct from new.subcategory
    or old.tags                   is distinct from new.tags
    or old.locale                 is distinct from new.locale
    or old.seo_title              is distinct from new.seo_title
    or old.seo_description        is distinct from new.seo_description
    or old.seo_keyword_primary    is distinct from new.seo_keyword_primary
    or old.seo_keywords_secondary is distinct from new.seo_keywords_secondary
    or old.slug                   is distinct from new.slug
    or old.content_type           is distinct from new.content_type
    or old.startup_id             is distinct from new.startup_id
    or old.is_paid                is distinct from new.is_paid;

  v_status_changed := old.status is distinct from new.status;

  if not v_content_changed and not v_status_changed then
    return new;
  end if;

  select id into v_editor_id
  from public.authors
  where user_id = auth.uid()
  limit 1;

  if v_content_changed then
    insert into public.revisions (
      article_id, editor_id, revision_type,
      previous_status, new_status,
      title_snapshot, body_md_snapshot, snapshot, created_at
    ) values (
      old.id, v_editor_id, 'content',
      old.status, new.status,
      old.title, old.body_md,
      public.article_editorial_snapshot(old),
      now()
    );
  else
    -- Reiner Status-Wechsel: Timeline-Eintrag ohne Restore-Snapshot.
    insert into public.revisions (
      article_id, editor_id, revision_type,
      previous_status, new_status,
      title_snapshot, body_md_snapshot, snapshot, created_at
    ) values (
      old.id, v_editor_id, 'status_change',
      old.status, new.status,
      old.title, null, null,
      now()
    );
  end if;

  return new;
end;
$fn$;

create or replace function public.restore_article_revision(p_article_id uuid, p_revision_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_rev public.revisions;
  v_art public.articles;
  v_snap jsonb;
  v_restore_slug boolean;
  v_may_edit boolean;
  v_showcase uuid;
begin
  select * into v_rev from public.revisions
   where id = p_revision_id and article_id = p_article_id;
  if not found then return false; end if;

  -- Status-Wechsel-Eintraege haben nichts zu restaurieren.
  if v_rev.revision_type = 'status_change' then return false; end if;
  -- Restaurierbar nur mit vollem Snapshot ODER Alt-Body-Markdown.
  if v_rev.snapshot is null and coalesce(v_rev.body_md_snapshot, '') = '' then
    return false;
  end if;

  select * into v_art from public.articles where id = p_article_id;
  if not found then return false; end if;

  -- Berechtigung wie die articles-UPDATE-Policies (gespiegelt, weil DEFINER
  -- die RLS umgeht).
  v_may_edit :=
    exists (select 1 from public.authors
              where user_id = auth.uid() and role = 'editor')
    or (
      v_art.author_id in (select id from public.authors where user_id = auth.uid())
      and v_art.status in ('draft', 'in_review')
    );
  if not v_may_edit then return false; end if;

  v_restore_slug := v_art.published_at is null;
  select id into v_showcase from public.categories where slug = 'showcase';

  -- Auto-Revision fuer den folgenden UPDATE unterdruecken; wir schreiben
  -- stattdessen einen typisierten 'restore'-Eintrag mit dem AKTUELLEN
  -- (Pre-Restore-)Stand — damit der Restore selbst rueckgaengig ist.
  perform set_config('app.skip_revision', 'on', true);

  insert into public.revisions (
    article_id, editor_id, revision_type,
    previous_status, new_status, title_snapshot, body_md_snapshot, snapshot,
    notes, created_at
  ) values (
    v_art.id,
    (select id from public.authors where user_id = auth.uid() limit 1),
    'restore',
    v_art.status, v_art.status, v_art.title, v_art.body_md,
    public.article_editorial_snapshot(v_art),
    'Wiederhergestellt aus Revision vom '
      || to_char(v_rev.created_at at time zone 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'),
    now()
  );

  v_snap := v_rev.snapshot;

  if v_snap is not null then
    -- Voller Restore. Status NIE aendern. Slug nur wenn nie publiziert.
    -- Hero-Studio-Felder: Snapshots vor 20261102150000 haben die Keys
    -- nicht -> NULL (damals kein Studio-Hero), bewusst so.
    -- Einordnung (content_type, startup_id, is_paid) NIE aendern: Sie steht
    -- nur zur Nachvollziehbarkeit im Snapshot. Die Kategorie folgt der
    -- heutigen Einordnung: Ein Unternehmensbeitrag bleibt in «showcase», ein
    -- redaktioneller Artikel uebernimmt «showcase» nicht aus einem Snapshot.
    update public.articles set
      title                  = v_snap->>'title',
      subtitle               = v_snap->>'subtitle',
      body_blocks            = v_snap->'body_blocks',
      body_md                = v_snap->>'body_md',
      excerpt                = v_snap->>'excerpt',
      cover_image_url        = v_snap->>'cover_image_url',
      cover_image_alt        = v_snap->>'cover_image_alt',
      cover_image_caption    = v_snap->>'cover_image_caption',
      cover_image_source     = v_snap->>'cover_image_source',
      og_image_url           = v_snap->>'og_image_url',
      cover_video_url        = v_snap->>'cover_video_url',
      cover_video_alt        = v_snap->>'cover_video_alt',
      cover_recipe           = v_snap->'cover_recipe',
      category_id            = case
                                 when content_type = 'company' then category_id
                                 when (v_snap->>'category_id')::uuid = v_showcase then category_id
                                 else coalesce((v_snap->>'category_id')::uuid, category_id)
                               end,
      subcategory            = v_snap->>'subcategory',
      tags                   = coalesce(
                                 array(select jsonb_array_elements_text(v_snap->'tags')),
                                 '{}'::text[]),
      locale                 = coalesce(v_snap->>'locale', locale),
      seo_title              = v_snap->>'seo_title',
      seo_description        = v_snap->>'seo_description',
      seo_keyword_primary    = v_snap->>'seo_keyword_primary',
      seo_keywords_secondary = coalesce(
                                 array(select jsonb_array_elements_text(v_snap->'seo_keywords_secondary')),
                                 '{}'::text[]),
      slug                   = case when v_restore_slug then v_snap->>'slug' else slug end
    where id = p_article_id;
  else
    -- Alt-Revision (kein Snapshot): nur Titel + Body (Markdown). body_blocks
    -- → null, damit der Editor es als Legacy behandelt (Re-Migration).
    update public.articles set
      title       = v_rev.title_snapshot,
      body_md     = v_rev.body_md_snapshot,
      body_blocks = null
    where id = p_article_id;
  end if;

  return true;
end;
$fn$;

-- Rueckbau (Funktionen: Stand aus 20261102150000_hero_studio_cover_fields.sql
-- wieder einspielen):
-- drop trigger if exists articles_guard_content_type on public.articles;
-- drop function if exists public.articles_guard_content_type();
-- alter table public.articles drop column if exists is_paid, drop column if exists startup_id, drop column if exists content_type;
-- delete from public.categories where slug = 'showcase';
