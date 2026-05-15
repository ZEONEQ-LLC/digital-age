-- Phase T3 — Admin-Tag-Verwaltung.
--
-- Append-only Audit-Log für Rename/Merge/Delete-Operationen plus drei
-- SECURITY-DEFINER-Functions, die jeweils atomar Tag-Operation +
-- articles.tags[]-Backwards-Compat + Audit-Eintrag erledigen.
--
-- UPDATE/DELETE-RLS auf `tags` und `article_tags` ist bereits aus T1
-- vorhanden (`tags_editor_update/delete`, `article_tags_editor_all`).
-- Die Functions laufen mit SECURITY DEFINER und gaten intern via
-- `public.is_editor()` — RLS-bypass ist absichtlich.

-- ---------------------------------------------------------------------------
-- Audit-Log-Tabelle
-- ---------------------------------------------------------------------------

create table public.tag_audit_log (
  id uuid primary key default gen_random_uuid(),
  operation text not null check (operation in ('rename', 'merge', 'delete')),
  -- tag_id ist BEWUSST kein FK: bei delete/merge ist der Tag weg, der
  -- Audit-Eintrag soll aber bestehen bleiben. Bei rename ist tag_id der
  -- weiterhin existierende Tag.
  tag_id uuid,
  tag_name_before text not null,
  -- tag_name_after: bei rename der neue Name, bei merge der Ziel-Tag-Name,
  -- bei delete NULL.
  tag_name_after text,
  merged_into_tag_id uuid references public.tags(id) on delete set null,
  affected_article_ids uuid[],
  performed_by uuid references auth.users(id) on delete set null,
  performed_at timestamptz not null default now()
);

create index tag_audit_log_performed_at_idx
  on public.tag_audit_log (performed_at desc);
create index tag_audit_log_tag_id_idx
  on public.tag_audit_log (tag_id);

-- RLS: Editor liest, kein INSERT/UPDATE/DELETE-Policy (Inserts gehen nur
-- via SECURITY-DEFINER-Functions; UPDATE/DELETE ist niemand erlaubt).
alter table public.tag_audit_log enable row level security;

create policy "tag_audit_log_editor_read"
  on public.tag_audit_log
  for select
  to authenticated
  using (public.is_editor());

-- ---------------------------------------------------------------------------
-- rename_tag(p_tag_id, p_new_name)
-- ---------------------------------------------------------------------------

create or replace function public.rename_tag(
  p_tag_id uuid,
  p_new_name text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_name text;
  v_old_slug text;
  v_new_name text;
  v_new_slug text;
  v_affected uuid[];
begin
  if not public.is_editor() then
    raise exception 'Permission denied: editor role required'
      using errcode = '42501';
  end if;

  v_new_name := trim(p_new_name);
  if v_new_name = '' then
    raise exception 'Tag name must not be empty' using errcode = '22023';
  end if;

  select name, slug into v_old_name, v_old_slug
    from public.tags where id = p_tag_id;
  if v_old_name is null then
    raise exception 'Tag not found' using errcode = 'P0002';
  end if;

  -- Slug-Regenerierung — identische Logik wie `src/lib/tagSlug.ts`.
  v_new_slug := lower(v_new_name);
  v_new_slug := replace(v_new_slug, 'ä', 'ae');
  v_new_slug := replace(v_new_slug, 'ö', 'oe');
  v_new_slug := replace(v_new_slug, 'ü', 'ue');
  v_new_slug := replace(v_new_slug, 'ß', 'ss');
  v_new_slug := replace(v_new_slug, '&', 'und');
  v_new_slug := regexp_replace(v_new_slug, '[^a-z0-9]+', '-', 'g');
  v_new_slug := regexp_replace(v_new_slug, '^-+|-+$', '', 'g');
  v_new_slug := substring(v_new_slug from 1 for 80);

  if v_new_slug = '' then
    raise exception 'Resulting slug is empty' using errcode = '22023';
  end if;

  if v_new_slug <> v_old_slug and exists (
    select 1 from public.tags
    where slug = v_new_slug and id <> p_tag_id
  ) then
    raise exception 'Slug % already exists', v_new_slug
      using errcode = '23505';
  end if;

  select array_agg(article_id) into v_affected
    from public.article_tags where tag_id = p_tag_id;

  update public.tags
    set name = v_new_name, slug = v_new_slug, updated_at = now()
    where id = p_tag_id;

  if v_affected is not null then
    update public.articles
      set tags = array_replace(tags, v_old_name, v_new_name)
      where id = any(v_affected);
  end if;

  insert into public.tag_audit_log (
    operation, tag_id, tag_name_before, tag_name_after,
    affected_article_ids, performed_by
  ) values (
    'rename', p_tag_id, v_old_name, v_new_name,
    v_affected, auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'new_slug', v_new_slug,
    'affected_count', coalesce(array_length(v_affected, 1), 0)
  );
end;
$$;

grant execute on function public.rename_tag(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- merge_tags(p_from_id, p_to_id)
-- ---------------------------------------------------------------------------

create or replace function public.merge_tags(
  p_from_id uuid,
  p_to_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_name text;
  v_to_name text;
  v_affected uuid[];
begin
  if not public.is_editor() then
    raise exception 'Permission denied: editor role required'
      using errcode = '42501';
  end if;

  if p_from_id = p_to_id then
    raise exception 'Cannot merge tag into itself' using errcode = '22023';
  end if;

  select name into v_from_name from public.tags where id = p_from_id;
  select name into v_to_name from public.tags where id = p_to_id;

  if v_from_name is null or v_to_name is null then
    raise exception 'Tag not found' using errcode = 'P0002';
  end if;

  select array_agg(article_id) into v_affected
    from public.article_tags where tag_id = p_from_id;

  -- Junctions umhängen, Duplikate via on-conflict ignorieren.
  insert into public.article_tags (article_id, tag_id)
    select article_id, p_to_id
      from public.article_tags where tag_id = p_from_id
    on conflict (article_id, tag_id) do nothing;

  delete from public.article_tags where tag_id = p_from_id;

  if v_affected is not null then
    -- Backwards-Compat-Spalte: From-Name raus, To-Name rein (dedupliziert).
    update public.articles
      set tags = (
        select array_agg(distinct x) from unnest(
          array_remove(coalesce(tags, '{}'::text[]), v_from_name)
            || array[v_to_name]
        ) as x
      )
      where id = any(v_affected);
  end if;

  delete from public.tags where id = p_from_id;

  insert into public.tag_audit_log (
    operation, tag_id, tag_name_before, tag_name_after,
    merged_into_tag_id, affected_article_ids, performed_by
  ) values (
    'merge', null, v_from_name, v_to_name,
    p_to_id, v_affected, auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'affected_count', coalesce(array_length(v_affected, 1), 0)
  );
end;
$$;

grant execute on function public.merge_tags(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_tag(p_tag_id)
-- ---------------------------------------------------------------------------

create or replace function public.delete_tag(
  p_tag_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag_name text;
  v_affected uuid[];
begin
  if not public.is_editor() then
    raise exception 'Permission denied: editor role required'
      using errcode = '42501';
  end if;

  select name into v_tag_name from public.tags where id = p_tag_id;
  if v_tag_name is null then
    raise exception 'Tag not found' using errcode = 'P0002';
  end if;

  select array_agg(article_id) into v_affected
    from public.article_tags where tag_id = p_tag_id;

  if v_affected is not null then
    update public.articles
      set tags = array_remove(tags, v_tag_name)
      where id = any(v_affected);
  end if;

  -- Junctions sind via on-delete-cascade weg, aber wir delete-en explizit
  -- damit das Audit-Log unabhängig vom Cascade-Verhalten konsistent ist.
  delete from public.article_tags where tag_id = p_tag_id;
  delete from public.tags where id = p_tag_id;

  insert into public.tag_audit_log (
    operation, tag_id, tag_name_before, tag_name_after,
    affected_article_ids, performed_by
  ) values (
    'delete', null, v_tag_name, null,
    v_affected, auth.uid()
  );

  return jsonb_build_object(
    'success', true,
    'affected_count', coalesce(array_length(v_affected, 1), 0)
  );
end;
$$;

grant execute on function public.delete_tag(uuid) to authenticated;
