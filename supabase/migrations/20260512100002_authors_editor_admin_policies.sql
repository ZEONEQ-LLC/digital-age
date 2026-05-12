-- Phase 7 PR B — Editor-CRUD-Policies auf authors
--
-- Session B legte nur "user can update own author profile" an. Für das
-- Editor-Admin-Panel braucht der Editor zusätzlich:
--   - insert  (Author hinzufügen, ggf. mit Invite)
--   - update  (Profil-Felder + Role-Change auf andere Rows)
--   - delete  (mit Vorsicht; Application-Layer prevented Löschung wenn Articles dranhängen)
--
-- Self-Update-Policy aus Session B bleibt für non-editors gültig.
-- Read auf authors ist via initial_schema bereits public (alle dürfen).

drop policy if exists "authors_editor_insert" on public.authors;
create policy "authors_editor_insert"
  on public.authors for insert
  to authenticated
  with check (
    exists (
      select 1 from public.authors a
      where a.user_id = auth.uid() and a.role = 'editor'
    )
  );

drop policy if exists "authors_editor_update" on public.authors;
create policy "authors_editor_update"
  on public.authors for update
  to authenticated
  using (
    exists (
      select 1 from public.authors a
      where a.user_id = auth.uid() and a.role = 'editor'
    )
  )
  with check (
    exists (
      select 1 from public.authors a
      where a.user_id = auth.uid() and a.role = 'editor'
    )
  );

drop policy if exists "authors_editor_delete" on public.authors;
create policy "authors_editor_delete"
  on public.authors for delete
  to authenticated
  using (
    exists (
      select 1 from public.authors a
      where a.user_id = auth.uid() and a.role = 'editor'
    )
  );
