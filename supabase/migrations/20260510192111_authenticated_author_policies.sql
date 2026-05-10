-- Phase 7 Session B — Authenticated Author RLS Policies
-- Ergänzt das Public-Read-Setup aus 20260510160843_initial_schema.sql um
-- Author/Editor-spezifische Rechte. Three-Role-Modell:
--   external — Pitcher ohne Login (kein RLS-write hier, geht via spezielle
--              Insert-Flow in Session C)
--   author   — eigene drafts/in_review CRUD
--   editor   — alles CRUD inkl. Status-Wechsel mit Audit-Trail

-- =========================================================================
-- ARTICLES
-- =========================================================================

create policy "authors can read own articles"
  on articles for select
  using (
    auth.uid() in (
      select user_id from authors where authors.id = articles.author_id
    )
  );

create policy "editors can read all articles"
  on articles for select
  using (
    exists (
      select 1 from authors
      where authors.user_id = auth.uid()
        and authors.role = 'editor'
    )
  );

create policy "authors and editors can insert articles"
  on articles for insert
  with check (
    exists (
      select 1 from authors
      where authors.user_id = auth.uid()
        and authors.role in ('author', 'editor')
        and authors.id = articles.author_id
    )
  );

create policy "authors can update own non-published articles"
  on articles for update
  using (
    auth.uid() in (select user_id from authors where authors.id = articles.author_id)
    and status in ('draft', 'in_review')
  );

create policy "editors can update any article"
  on articles for update
  using (
    exists (
      select 1 from authors
      where authors.user_id = auth.uid()
        and authors.role = 'editor'
    )
  );

-- =========================================================================
-- AUTHORS — Self-Update erlaubt, ABER role-Feld bleibt unverändert
-- =========================================================================

create policy "user can update own author profile"
  on authors for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and role = (select role from authors where user_id = auth.uid())
  );

-- =========================================================================
-- REVISIONS — Audit-Trail. Author liest eigene, Editor liest alle.
-- =========================================================================

create policy "authors can read own article revisions"
  on revisions for select
  using (
    exists (
      select 1 from articles
      join authors on authors.id = articles.author_id
      where articles.id = revisions.article_id
        and authors.user_id = auth.uid()
    )
  );

create policy "editors can read all revisions"
  on revisions for select
  using (
    exists (
      select 1 from authors
      where authors.user_id = auth.uid()
        and authors.role = 'editor'
    )
  );

create policy "editors can insert revisions"
  on revisions for insert
  with check (
    exists (
      select 1 from authors
      where authors.user_id = auth.uid()
        and authors.role = 'editor'
    )
  );

-- TODO Session D: Podcasts-Policies analog (host_id-basiert, Editor full access)
