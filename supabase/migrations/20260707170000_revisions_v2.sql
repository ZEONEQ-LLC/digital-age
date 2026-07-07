-- Revisions v2: vollstaendige Snapshots, typisierte Timeline, Ein-Klick-Restore.
--
-- Aenderungen:
--   1) revisions.snapshot jsonb (vollstaendiger redaktioneller Zustand) +
--      revision_type ('content' | 'status_change' | 'restore').
--   2) Trigger create_article_revision v2: content-Revision bei echter
--      redaktioneller Aenderung (OLD/NEW-Vergleich ueber die Feldliste),
--      sonst status_change-Eintrag bei reinem Status-Wechsel. Reine
--      seo_review-/derived-Updates → nichts. Waehrend eines Restores
--      uebersprungen (GUC app.skip_revision).
--   3) restore_article_revision-RPC: Pre-Restore-Snapshot + Feld-Update
--      atomar in EINER Transaktion.
--
-- Ever-published-Signal: articles.published_at (wird nur beim ersten Publish
-- gesetzt und nie geloescht) — kein first_published_at noetig.

-- =========================================================================
-- 1) Neue Spalten
-- =========================================================================
alter table public.revisions
  add column snapshot jsonb,
  add column revision_type text not null default 'content'
    check (revision_type in ('content', 'status_change', 'restore'));

-- =========================================================================
-- 2) Snapshot-Helper: baut den redaktionellen jsonb-Zustand aus einer
--    articles-Row. Muss mit REVISION_SNAPSHOT_FIELDS (src/lib/revisionSnapshot.ts)
--    synchron bleiben. Enthaelt BEWUSST NICHT status/seo_review/is_*.
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
-- 3) Trigger v2 (ersetzt die Funktion; der bestehende BEFORE-UPDATE-Trigger
--    articles_revision_on_update bleibt und nutzt die neue Funktion).
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
-- 4) Restore-RPC. SECURITY DEFINER, weil die Funktion die interne
--    revisions-Tabelle beschreibt (kein authenticated-INSERT-Policy) —
--    die Berechtigung wird explizit wie die articles-UPDATE-Policies
--    gespiegelt (Editor: alles; Autor: eigene Artikel in draft/in_review).
--    Kein neues Policy-Design. Alles in EINER Transaktion.
-- =========================================================================
create or replace function public.restore_article_revision(
  p_article_id uuid,
  p_revision_id uuid
)
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

grant execute on function public.restore_article_revision(uuid, uuid) to authenticated;

-- ROLLBACK (auskommentiert, nur als Doku):
-- drop function if exists public.restore_article_revision(uuid, uuid);
-- drop function if exists public.article_editorial_snapshot(public.articles);
-- (create_article_revision auf die v1-Fassung zuruecksetzen — siehe
--  20260511203039_articles_revision_trigger.sql)
-- alter table public.revisions drop column if exists revision_type;
-- alter table public.revisions drop column if exists snapshot;
