-- Phase 7 PR B — handle_new_user um Invite-Recognition erweitern
--
-- Reihenfolge im neuen Trigger:
--   1. Aktives Invite mit matching email suchen (intended_role merken)
--   2. Placeholder-Author mit matching email + user_id IS NULL suchen
--   3a. Falls Placeholder vorhanden: merge (user_id setzen), role upgrade falls Invite
--   3b. Falls kein Placeholder: neuen Author anlegen mit intended_role
--       (oder 'external' als Fallback wie bisher)
--   4. Falls Invite vorhanden: als accepted markieren, created_author_id setzen

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_invite_id uuid;
  v_intended_role public.author_role;
  v_local_part text;
  v_slug text;
begin
  -- 1. Aktives Invite mit matching email
  select id, intended_role into v_invite_id, v_intended_role
  from public.invites
  where lower(email) = lower(new.email)
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  order by invited_at desc
  limit 1;

  -- 2. Placeholder-Author mit matching email
  select id into v_existing_id
  from public.authors
  where lower(email) = lower(new.email)
    and user_id is null
  limit 1;

  -- 3a. Placeholder vorhanden → merge
  if v_existing_id is not null then
    update public.authors
    set user_id = new.id,
        role = coalesce(v_intended_role, role),
        updated_at = now()
    where id = v_existing_id;

    if v_invite_id is not null then
      update public.invites
      set accepted_at = now(),
          created_author_id = v_existing_id
      where id = v_invite_id;
    end if;

    return new;
  end if;

  -- 3b. Kein Placeholder → neuen Author anlegen
  v_local_part := split_part(new.email, '@', 1);
  v_slug := lower(regexp_replace(v_local_part, '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    v_slug := 'user';
  end if;

  begin
    insert into public.authors (user_id, email, display_name, slug, role)
    values (
      new.id,
      new.email,
      v_local_part,
      v_slug,
      coalesce(v_intended_role, 'external')
    )
    returning id into v_existing_id;
  exception when unique_violation then
    insert into public.authors (user_id, email, display_name, slug, role)
    values (
      new.id,
      new.email,
      v_local_part,
      v_slug || '-' || substring(new.id::text, 1, 8),
      coalesce(v_intended_role, 'external')
    )
    returning id into v_existing_id;
  end;

  -- 4. Invite als accepted markieren
  if v_invite_id is not null then
    update public.invites
    set accepted_at = now(),
        created_author_id = v_existing_id
    where id = v_invite_id;
  end if;

  return new;
end;
$$;
