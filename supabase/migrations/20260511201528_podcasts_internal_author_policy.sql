-- Phase 7 Session D Fix-up — Restrict podcast recommendations to internal authors
--
-- Mock-Plattform hatte `assertRecommenderEligible` als Frontend-Check.
-- Auf DB-Level wird das jetzt via RLS enforced: nur authors mit role 'author'
-- oder 'editor' dürfen Empfehlungen anlegen/updaten. External-Authors behalten
-- read access (über die bestehende `podcasts_author_read_own`-Policy), können
-- aber nicht inserten oder updaten.

drop policy if exists "podcasts_author_insert_own" on public.podcasts;
drop policy if exists "podcasts_author_update_own" on public.podcasts;

create policy "podcasts_internal_author_insert"
  on public.podcasts for insert
  to authenticated
  with check (
    recommended_by_id in (
      select id from public.authors
      where user_id = auth.uid()
        and role in ('author', 'editor')
    )
  );

create policy "podcasts_internal_author_update"
  on public.podcasts for update
  to authenticated
  using (
    recommended_by_id in (
      select id from public.authors
      where user_id = auth.uid()
        and role in ('author', 'editor')
    )
  )
  with check (
    recommended_by_id in (
      select id from public.authors
      where user_id = auth.uid()
        and role in ('author', 'editor')
    )
  );
