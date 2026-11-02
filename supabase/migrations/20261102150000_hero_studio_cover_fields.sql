-- Hero Studio, Teil 1: Daten und Ausspielung (PR 180).
--
-- Das Hero Studio (Tab im Artikel-Editor, folgt in PR 2a/2b/3) erzeugt das
-- Titelbild eines Beitrags im Browser und legt dabei ein Teilen-Bild, eine
-- optionale Animation und ein Rezept ab. Diese Migration schafft nur die
-- Datenbasis; Editor-UI und Studio kommen in spaeteren PRs.
--
-- (1) Fuenf Spalten auf public.articles, alle NULLABLE:
--   - og_image_url     text   Bild zum Teilen 1200x630 fuer og:image und
--                             twitter:image. Leer = cover_image_url wie bisher.
--                             Bewusst ohne cover_-Praefix: Seitenfeld, spaeter
--                             auch ohne Hero Studio nutzbar.
--   - cover_video_url  text   Hero-Animation (MP4, Loop, stumm), nur auf der
--                             Beitragsseite. Leer = statisches Hero.
--   - cover_video_alt  text   Beschreibung der Animation. Keine Pflicht, kein
--                             Publish-Gate.
--   - cover_recipe     jsonb  Rezept des Hero Studio (Engine, Variante,
--                             Overrides, Text, Motive). Form wird in PR 2a
--                             verbindlich; Pflicht ist nur ein numerisches
--                             `version`.
--   - cover_proposals  jsonb  Zwischenspeicher der KI-Vorschlaege (ab PR 3).
--                             Nicht redaktionell: NICHT im Revisions-Snapshot,
--                             loest KEINE Revision aus (gleiche Begruendung
--                             wie copilot_last_run, 20260707190000).
--
-- (2) Bucket `articles`: video/mp4 zur MIME-Whitelist, nur fuer die
--     Hero-Studio-Animation (Direkt-Upload aus dem Browser, PR 2b). Das
--     Limit bleibt 5 MB. Die Server-Whitelist in storageActions.ts bleibt
--     ein reiner Bild-Upload.
--
-- (3) Revisionen: article_editorial_snapshot, create_article_revision und
--     restore_article_revision um og_image_url, cover_video_url,
--     cover_video_alt und cover_recipe erweitert (cover_proposals NICHT).
--     Basis sind die LIVE-Definitionen aus der DB (pg_get_functiondef,
--     02.11.2026); sie sind textgleich mit 20260707170000_revisions_v2.sql.
--     20260707180000 hat nur Grants geaendert, 20260707190000 nur eine
--     Spalte ergaenzt. Signaturen, security definer und search_path bleiben;
--     `create or replace` behaelt die bestehenden Grants.
--
--     Alte Snapshots haben die neuen Keys nicht: ein Restore setzt die vier
--     Felder dann auf NULL. Das ist richtig, damals gab es kein Studio-Hero.
--
-- Additiv. Spiegel im Code: src/lib/revisionSnapshot.ts
-- (REVISION_SNAPSHOT_FIELDS) + src/lib/__tests__/revisionSnapshot.manual.ts.

-- =========================================================================
-- 1) Spalten
-- =========================================================================
alter table public.articles
  add column og_image_url text,
  add column cover_video_url text,
  add column cover_video_alt text,
  add column cover_recipe jsonb,
  add column cover_proposals jsonb;

comment on column public.articles.og_image_url is
  'Bild zum Teilen (1200x630, PNG) fuer og:image und twitter:image. NULL = cover_image_url wie bisher. Vom Hero Studio erzeugt, spaeter auch unabhaengig nutzbar.';
comment on column public.articles.cover_video_url is
  'Hero-Animation (MP4, Loop, stumm) fuer die Beitragsseite. NULL = statisches Hero. Listen, Spotlight, Rubriken und Social bleiben immer statisch.';
comment on column public.articles.cover_video_alt is
  'Beschreibung der Hero-Animation (fuer Studio, Downloads, spaeteres VideoObject). Keine Publish-Pflicht; auf der Seite nicht gerendert.';
comment on column public.articles.cover_recipe is
  'Rezept des Hero Studio: {version:number, ...}. Erlaubt das Neuberechnen des Heros in jedem Format. Form ab PR 2a verbindlich. Im Revisions-Snapshot enthalten.';
comment on column public.articles.cover_proposals is
  'Zwischenspeicher der KI-Vorschlaege des Hero Studio (ab PR 3). Nicht redaktionell: nicht im Revisions-Snapshot, loest keine Revision aus.';

-- =========================================================================
-- 2) Bucket articles: MP4 nur fuer Hero-Studio-Animationen
-- =========================================================================
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']
where id = 'articles';

-- =========================================================================
-- 3a) Snapshot: vier neue Keys (cover_proposals bewusst NICHT)
-- =========================================================================
create or replace function public.article_editorial_snapshot(a public.articles)
returns jsonb
language sql
immutable
set search_path = public
as $$
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
    'slug', a.slug
  );
$$;

-- =========================================================================
-- 3b) Trigger-Funktion: Feldvergleich um die vier Felder erweitert.
--     Der BEFORE-UPDATE-Trigger articles_revision_on_update bleibt.
-- =========================================================================
create or replace function public.create_article_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    or old.slug                   is distinct from new.slug;

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
$$;

-- =========================================================================
-- 3c) Restore: vier Felder zuruecksetzen. Alte Snapshots (vor dieser
--     Migration) haben die Keys nicht -> NULL, bewusst (kein Studio-Hero
--     damals). Rest unveraendert.
-- =========================================================================
create or replace function public.restore_article_revision(p_article_id uuid, p_revision_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rev public.revisions;
  v_art public.articles;
  v_snap jsonb;
  v_restore_slug boolean;
  v_may_edit boolean;
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
      category_id            = coalesce((v_snap->>'category_id')::uuid, category_id),
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
$$;

-- ROLLBACK (auskommentiert, nur als Doku):
-- Funktionen: die vorherigen Live-Definitionen sind textgleich mit
-- 20260707170000_revisions_v2.sql (Abschnitte 2, 3 und 5). Diese drei
-- `create or replace`-Bloecke erneut ausfuehren, dann:
-- update storage.buckets
--   set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
--   where id = 'articles';
-- alter table public.articles drop column if exists cover_proposals;
-- alter table public.articles drop column if exists cover_recipe;
-- alter table public.articles drop column if exists cover_video_alt;
-- alter table public.articles drop column if exists cover_video_url;
-- alter table public.articles drop column if exists og_image_url;
