-- Avatar-Bucket: public read (für Article-Cards/Author-Profile),
-- authenticated upload (RLS regelt wer welches Avatar überschreiben darf).
--
-- Pfad-Konvention: `<author_id>/<filename>` — RLS prüft das erste Pfad-
-- Segment gegen die author_id des eingeloggten Users (oder Editor-Override).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Helper-Functions in public schema, SECURITY DEFINER damit storage-RLS
-- sie ohne Recursion-Risk aufrufen kann (search_path = public).

create or replace function public.current_author_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.authors where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.authors
    where user_id = auth.uid() and role = 'editor'
  );
$$;

-- Public-read: Avatare sind auf der Website sichtbar.
create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Insert/Update/Delete: eigenes Avatar ODER Editor-Rolle.
create policy "avatars_insert_own_or_editor"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = public.current_author_id()::text
      or public.is_editor()
    )
  );

create policy "avatars_update_own_or_editor"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = public.current_author_id()::text
      or public.is_editor()
    )
  );

create policy "avatars_delete_own_or_editor"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = public.current_author_id()::text
      or public.is_editor()
    )
  );
