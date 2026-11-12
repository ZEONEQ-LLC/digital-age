-- Volltextsuche erweitert (Entscheid Ali 12.11.2026): /suche findet neben
-- Artikeln auch Prompts, Podcasts und Startups, als eigene Bloecke.
--
-- Muster wie search_articles (20261111230000): SECURITY INVOKER (RLS und
-- Spaltenrechte gelten, die Funktionen filtern zusaetzlich auf oeffentliche
-- Zeilen), websearch_to_tsquery ('german'), Ausschnitt per ts_headline mit
-- Markierungen ⟦…⟧, hoechstens 50 Treffer. Die Funktionen lesen nur
-- Spalten, die anon lesen darf (keine Einreicher-Daten).
--
-- Bewusst ohne Index: Die Tabellen sind klein (Dutzende Zeilen), ein
-- sequentieller Scan kostet weniger als ein weiterer Ausdrucksindex.
-- Gewichte: Titel/Name A, Kurztext B, Langtext C.
--
-- Additiv: nur neue Funktionen.

create or replace function public.search_prompts(p_query text, p_limit integer default 20)
returns table (id uuid, rank real, snippet text)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('pg_catalog.german', left(coalesce(p_query, ''), 200)) as tsq
  ), d as (
    select p.id, p.published_at, p.context, p.prompt_text,
      setweight(to_tsvector('pg_catalog.german', coalesce(p.title, '')), 'A')
      || setweight(to_tsvector('pg_catalog.german', coalesce(p.context, '') || ' ' || coalesce(p.category, '')), 'B')
      || setweight(to_tsvector('pg_catalog.german', coalesce(p.prompt_text, '')), 'C') as doc
    from public.ai_prompts p
    where p.status in ('published', 'featured')
  )
  select
    d.id,
    ts_rank_cd(d.doc, q.tsq) as rank,
    ts_headline(
      'pg_catalog.german',
      coalesce(d.context, '') || ' … ' || left(coalesce(d.prompt_text, ''), 4000),
      q.tsq,
      'StartSel=⟦, StopSel=⟧, MaxWords=28, MinWords=12, ShortWord=2, MaxFragments=1, FragmentDelimiter=" … "'
    ) as snippet
  from d, q
  where numnode(q.tsq) > 0 and d.doc @@ q.tsq
  order by rank desc, d.published_at desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.search_podcasts(p_query text, p_limit integer default 20)
returns table (id uuid, rank real, snippet text)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('pg_catalog.german', left(coalesce(p_query, ''), 200)) as tsq
  ), d as (
    select p.id, p.recommended_at, p.description,
      setweight(to_tsvector('pg_catalog.german', coalesce(p.title, '')), 'A')
      || setweight(to_tsvector('pg_catalog.german', coalesce(p.podcast_category, '')), 'B')
      || setweight(to_tsvector('pg_catalog.german', coalesce(p.description, '')), 'C') as doc
    from public.podcasts p
    where p.is_published
  )
  select
    d.id,
    ts_rank_cd(d.doc, q.tsq) as rank,
    ts_headline(
      'pg_catalog.german',
      left(coalesce(d.description, ''), 4000),
      q.tsq,
      'StartSel=⟦, StopSel=⟧, MaxWords=28, MinWords=12, ShortWord=2, MaxFragments=1, FragmentDelimiter=" … "'
    ) as snippet
  from d, q
  where numnode(q.tsq) > 0 and d.doc @@ q.tsq
  order by rank desc, d.recommended_at desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.search_startups(p_query text, p_limit integer default 20)
returns table (id uuid, rank real, snippet text)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('pg_catalog.german', left(coalesce(p_query, ''), 200)) as tsq
  ), d as (
    select s.id, s.published_at, s.tagline, s.description,
      setweight(to_tsvector('pg_catalog.german', coalesce(s.name, '')), 'A')
      || setweight(to_tsvector('pg_catalog.german',
           coalesce(s.tagline, '') || ' ' || coalesce(s.industry, '') || ' ' || coalesce(s.city, '')), 'B')
      || setweight(to_tsvector('pg_catalog.german', coalesce(s.description, '')), 'C') as doc
    from public.ai_startups s
    where s.status in ('published', 'featured')
  )
  select
    d.id,
    ts_rank_cd(d.doc, q.tsq) as rank,
    ts_headline(
      'pg_catalog.german',
      coalesce(d.tagline, '') || ' … ' || left(coalesce(d.description, ''), 4000),
      q.tsq,
      'StartSel=⟦, StopSel=⟧, MaxWords=28, MinWords=12, ShortWord=2, MaxFragments=1, FragmentDelimiter=" … "'
    ) as snippet
  from d, q
  where numnode(q.tsq) > 0 and d.doc @@ q.tsq
  order by rank desc, d.published_at desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- Rechte nach der Regel aus PR 191: erst allen entziehen, dann gezielt
-- erlauben. Die Suche ist oeffentlich.
revoke execute on function public.search_prompts(text, integer) from public, anon, authenticated;
grant execute on function public.search_prompts(text, integer) to anon, authenticated, service_role;
revoke execute on function public.search_podcasts(text, integer) from public, anon, authenticated;
grant execute on function public.search_podcasts(text, integer) to anon, authenticated, service_role;
revoke execute on function public.search_startups(text, integer) from public, anon, authenticated;
grant execute on function public.search_startups(text, integer) to anon, authenticated, service_role;
