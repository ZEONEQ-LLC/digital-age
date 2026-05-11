-- Phase 7 Session E — Merge-on-first-login Logic im Auth-Trigger
--
-- Session B legte für jeden neuen auth.users-Eintrag einen frischen
-- authors-Row an. Session C seedete Mock-Authors (Andreas, Matthias, Marc) mit
-- Platzhalter-Emails und user_id=null. Wenn diese sich erstmals einloggen,
-- würde der Trigger eine unique-Violation auf email werfen.
--
-- Neuer Flow:
--   1. Existiert authors-Row mit matching email UND user_id IS NULL?
--      → UPDATE: user_id = NEW.id (claim/merge)
--   2. Sonst: INSERT wie bisher (mit slug-Kollisions-Fallback)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_local_part text;
  v_slug text;
begin
  select id into v_existing_id
  from public.authors
  where lower(email) = lower(new.email)
    and user_id is null
  limit 1;

  if v_existing_id is not null then
    update public.authors
    set user_id = new.id,
        updated_at = now()
    where id = v_existing_id;
    return new;
  end if;

  v_local_part := split_part(new.email, '@', 1);
  v_slug := lower(regexp_replace(v_local_part, '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    v_slug := 'user';
  end if;

  begin
    insert into public.authors (user_id, email, display_name, slug, role)
    values (new.id, new.email, v_local_part, v_slug, 'external');
  exception when unique_violation then
    insert into public.authors (user_id, email, display_name, slug, role)
    values (
      new.id,
      new.email,
      v_local_part,
      v_slug || '-' || substring(new.id::text, 1, 8),
      'external'
    );
  end;

  return new;
end;
$$;
