-- Volltextsuche für Artikel (PR 193): Postgres-FTS statt Algolia.
-- Additiv: eine reine Funktion für das Suchdokument, ein GIN-Ausdrucksindex
-- (nur publizierte Artikel) und die RPC search_articles für /suche.
--
-- Bewusst KEINE generierte Spalte: articles wird an vielen Stellen mit
-- select("*") gelesen, ein tsvector über den ganzen Body würde jede dieser
-- Antworten aufblähen. Der Ausdrucksindex braucht keine Spalte; die Abfrage
-- muss dafür exakt denselben Ausdruck verwenden (search_articles tut das).
--
-- Sprache: 'german' für alle Artikel (Stammformen: Banken → bank). Englische
-- Artikel funktionieren damit auch, weil Dokument und Suchanfrage denselben
-- Stemmer durchlaufen. Gewichte: Titel A, Untertitel/Abstract/Tags B, Text C.

create or replace function public.article_search_document(
  p_title text,
  p_subtitle text,
  p_excerpt text,
  p_tags text[],
  p_body text
)
returns tsvector
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    setweight(to_tsvector('pg_catalog.german', coalesce(p_title, '')), 'A')
    || setweight(to_tsvector('pg_catalog.german',
         coalesce(p_subtitle, '') || ' ' || coalesce(p_excerpt, '') || ' ' ||
         coalesce(pg_catalog.array_to_string(p_tags, ' '), '')), 'B')
    || setweight(to_tsvector('pg_catalog.german', coalesce(p_body, '')), 'C');
$$;

create index articles_search_idx on public.articles
  using gin (public.article_search_document(title, subtitle, excerpt, tags, body_md))
  where status = 'published';

-- Treffer für /suche: id, Rang und ein Textausschnitt mit Markierungen
-- ⟦…⟧ um die Fundstellen (die Seite setzt daraus <mark>, nie rohes HTML).
-- SECURITY INVOKER: RLS gilt, die Funktion filtert zusätzlich auf published.
-- websearch_to_tsquery versteht "Phrase", OR und -Ausschluss; Anfragen nur
-- aus Stoppwörtern ergeben keine Treffer statt alles.
create or replace function public.search_articles(p_query text, p_limit integer default 20)
returns table (id uuid, rank real, snippet text)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('pg_catalog.german', left(coalesce(p_query, ''), 200)) as tsq
  )
  select
    a.id,
    ts_rank_cd(public.article_search_document(a.title, a.subtitle, a.excerpt, a.tags, a.body_md), q.tsq) as rank,
    ts_headline(
      'pg_catalog.german',
      coalesce(a.excerpt, '') || ' … ' || left(coalesce(a.body_md, ''), 6000),
      q.tsq,
      'StartSel=⟦, StopSel=⟧, MaxWords=32, MinWords=14, ShortWord=2, MaxFragments=1, FragmentDelimiter=" … "'
    ) as snippet
  from public.articles a, q
  where a.status = 'published'
    and numnode(q.tsq) > 0
    and public.article_search_document(a.title, a.subtitle, a.excerpt, a.tags, a.body_md) @@ q.tsq
  order by rank desc, a.published_at desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- Rechte nach der Regel aus PR 191: erst allen entziehen, dann gezielt
-- erlauben. Die Suche ist öffentlich (anon), das Suchdokument muss für alle
-- Rollen ausführbar sein, weil search_articles als INVOKER es aufruft.
revoke execute on function public.article_search_document(text, text, text, text[], text) from public, anon, authenticated;
grant execute on function public.article_search_document(text, text, text, text[], text) to anon, authenticated, service_role;
revoke execute on function public.search_articles(text, integer) from public, anon, authenticated;
grant execute on function public.search_articles(text, integer) to anon, authenticated, service_role;
