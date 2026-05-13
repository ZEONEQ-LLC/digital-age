-- Article-Image-Bucket: public read (für Article-Cards/Detail-Pages),
-- authenticated write nur durch Article-Owner oder Editor.
--
-- Pfad-Konvention: `<article_id>/<filename>` — RLS prüft das erste Pfad-
-- Segment gegen die author_id des Articles bzw. die Editor-Rolle des Users.
--
-- Helper-Funktionen `public.current_author_id()` und `public.is_editor()`
-- existieren bereits seit der avatars-Migration (20260511220724).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'articles',
  'articles',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Helper: prüft Berechtigung für Article-Image-Mutation.
--
-- Nimmt text statt uuid, damit eine ungültige UUID in (storage.foldername(name))[1]
-- nicht zu einem cast-Fehler führt — invalide Pfade werfen `false` und werden
-- damit von der Policy still abgelehnt.
--
-- SECURITY DEFINER + search_path = public, analog zu den anderen Helpern,
-- damit RLS-Recursion ausgeschlossen ist.
create or replace function public.can_modify_article_image(article_id_text text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  art_id uuid;
begin
  begin
    art_id := article_id_text::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  if public.is_editor() then
    return true;
  end if;
  return exists (
    select 1 from public.articles
    where id = art_id
      and author_id = public.current_author_id()
  );
end;
$$;

-- Public-read: Article-Bilder sind auf der Website sichtbar.
create policy "articles_storage_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'articles');

-- Insert: nur durch Owner oder Editor.
create policy "articles_storage_insert_owner_or_editor"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'articles'
    and public.can_modify_article_image((storage.foldername(name))[1])
  );

-- Update: nur durch Owner oder Editor.
create policy "articles_storage_update_owner_or_editor"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'articles'
    and public.can_modify_article_image((storage.foldername(name))[1])
  );

-- Delete: nur durch Owner oder Editor.
create policy "articles_storage_delete_owner_or_editor"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'articles'
    and public.can_modify_article_image((storage.foldername(name))[1])
  );
