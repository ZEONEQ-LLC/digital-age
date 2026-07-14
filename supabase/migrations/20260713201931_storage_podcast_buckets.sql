-- Storage-Buckets fuer self-hosted Podcasts: Audio + Episoden-Cover.
-- Beide public-read; Write nur fuer interne Autoren (role author/editor),
-- analog zum bestehenden Muster (articles/avatars). Kein Service-Role
-- client-side. Files sind immutable -> lange Cache-Control beim Upload
-- (im Client gesetzt).
--
-- Pfad-Konvention flach: audio als `<timestamp>-<name>.mp3`, Cover als
-- `<timestamp>-<name>.webp`. Ownership wird NICHT ueber ein Pfad-Segment
-- geprueft (Podcasts sind redaktionell kuratiert) -> Write-Gate = Rolle.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'podcast-audio',
  'podcast-audio',
  true,
  209715200, -- 200 MB
  array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'podcast-covers',
  'podcast-covers',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Helper: ist der aktuelle User ein interner Autor (author oder editor)?
-- SECURITY DEFINER + search_path = public, analog zu is_editor().
create or replace function public.is_internal_author()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.authors
    where user_id = auth.uid() and role in ('author', 'editor')
  );
$$;

revoke all on function public.is_internal_author() from public;
grant execute on function public.is_internal_author() to authenticated;

-- podcast-audio: public read, write nur interne Autoren.
create policy "podcast_audio_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'podcast-audio');

create policy "podcast_audio_insert_internal"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'podcast-audio' and public.is_internal_author());

create policy "podcast_audio_update_internal"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'podcast-audio' and public.is_internal_author());

create policy "podcast_audio_delete_internal"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'podcast-audio' and public.is_internal_author());

-- podcast-covers: public read, write nur interne Autoren.
create policy "podcast_covers_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'podcast-covers');

create policy "podcast_covers_insert_internal"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'podcast-covers' and public.is_internal_author());

create policy "podcast_covers_update_internal"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'podcast-covers' and public.is_internal_author());

create policy "podcast_covers_delete_internal"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'podcast-covers' and public.is_internal_author());

-- Rollback:
-- drop policy "podcast_covers_delete_internal" on storage.objects;
-- drop policy "podcast_covers_update_internal" on storage.objects;
-- drop policy "podcast_covers_insert_internal" on storage.objects;
-- drop policy "podcast_covers_public_read" on storage.objects;
-- drop policy "podcast_audio_delete_internal" on storage.objects;
-- drop policy "podcast_audio_update_internal" on storage.objects;
-- drop policy "podcast_audio_insert_internal" on storage.objects;
-- drop policy "podcast_audio_public_read" on storage.objects;
-- drop function if exists public.is_internal_author();
-- delete from storage.buckets where id in ('podcast-audio', 'podcast-covers');
