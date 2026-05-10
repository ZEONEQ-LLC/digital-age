-- Phase 7 Session B — Author Auto-Creation Trigger
-- Erzeugt für jeden neuen auth.users-Eintrag automatisch einen authors-Row
-- mit role='external'. Editor kann später via separate Action zu author/editor
-- upgraden (RLS-Policy in 20260510192111_authenticated_author_policies.sql
-- verbietet Self-Upgrade des role-Felds).

create or replace function handle_new_user()
returns trigger
security definer
set search_path = public
as $$
declare
  generated_slug text;
begin
  -- Slug aus Email-Local-Part, Lowercase. Falls Kollision: user_id-Prefix anhängen.
  generated_slug := lower(split_part(new.email, '@', 1));

  if exists (select 1 from public.authors where slug = generated_slug) then
    generated_slug := generated_slug || '-' || substr(new.id::text, 1, 8);
  end if;

  insert into public.authors (user_id, slug, display_name, email, role)
  values (
    new.id,
    generated_slug,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    'external'
  );

  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
