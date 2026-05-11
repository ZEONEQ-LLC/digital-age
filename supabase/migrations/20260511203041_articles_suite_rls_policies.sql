-- Phase 7 Session E — Articles Suite RLS Policies (consolidation)
--
-- Session B legte Policies an, die teils zu permissiv waren (insert ohne
-- status-Check, kein delete für Authors). Hier wird konsolidiert: drop+recreate
-- mit klarer Author/Editor-Aufteilung und Status-Gating.
--
-- Public-Read-Policy (status='published') aus Session A bleibt unverändert.

drop policy if exists "authors can read own articles" on public.articles;
drop policy if exists "editors can read all articles" on public.articles;
drop policy if exists "authors and editors can insert articles" on public.articles;
drop policy if exists "authors can update own non-published articles" on public.articles;
drop policy if exists "editors can update any article" on public.articles;

create policy "articles_author_read_own"
  on public.articles for select
  to authenticated
  using (
    author_id in (
      select id from public.authors where user_id = auth.uid()
    )
  );

create policy "articles_author_insert_own_draft"
  on public.articles for insert
  to authenticated
  with check (
    author_id in (
      select id from public.authors where user_id = auth.uid()
    )
    and status = 'draft'
  );

create policy "articles_author_update_own"
  on public.articles for update
  to authenticated
  using (
    author_id in (
      select id from public.authors where user_id = auth.uid()
    )
  )
  with check (
    author_id in (
      select id from public.authors where user_id = auth.uid()
    )
    and status in ('draft', 'in_review')
  );

create policy "articles_author_delete_own_draft"
  on public.articles for delete
  to authenticated
  using (
    author_id in (
      select id from public.authors where user_id = auth.uid()
    )
    and status = 'draft'
  );

create policy "articles_editor_all"
  on public.articles for all
  to authenticated
  using (
    exists (
      select 1 from public.authors
      where user_id = auth.uid() and role = 'editor'
    )
  )
  with check (
    exists (
      select 1 from public.authors
      where user_id = auth.uid() and role = 'editor'
    )
  );
