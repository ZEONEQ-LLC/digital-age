-- Phase 7 Session E — Articles Revision Trigger
--
-- Erzeugt automatisch eine Row in `revisions` bei jedem Update auf `articles`,
-- sofern title oder body_md sich tatsächlich geändert haben.
-- editor_id wird aus dem aktuellen auth.uid() → authors.id gemappt (kann null
-- sein bei system-internen Updates ohne Session).
-- new_status ist Pflichtfeld in revisions — Snapshot des Status NACH dem Update.

create or replace function public.create_article_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_editor_id uuid;
begin
  if (old.title is distinct from new.title) or (old.body_md is distinct from new.body_md) then
    select id into v_editor_id
    from public.authors
    where user_id = auth.uid()
    limit 1;

    insert into public.revisions (
      article_id,
      editor_id,
      previous_status,
      new_status,
      title_snapshot,
      body_md_snapshot,
      created_at
    ) values (
      old.id,
      v_editor_id,
      old.status,
      new.status,
      old.title,
      old.body_md,
      now()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists articles_revision_on_update on public.articles;
create trigger articles_revision_on_update
  before update on public.articles
  for each row execute function public.create_article_revision();
