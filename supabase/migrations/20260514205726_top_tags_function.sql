-- Phase T2 — Tag-Public-Frontend.
--
-- `get_top_tags(limit_count)` aggregiert Tag-Häufigkeiten über published
-- Artikel hinweg. Wird vom Frontend für die Top-5-Sidebar verwendet.
-- All-time, kein Zeitfenster. Sortierung: count DESC, dann name ASC.

create or replace function public.get_top_tags(limit_count int default 5)
returns table (
  id uuid,
  slug text,
  name text,
  article_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.slug, t.name, count(at.tag_id) as article_count
  from public.tags t
  join public.article_tags at on at.tag_id = t.id
  join public.articles a on a.id = at.article_id
  where a.status = 'published'
  group by t.id, t.slug, t.name
  order by article_count desc, t.name asc
  limit limit_count;
$$;

grant execute on function public.get_top_tags(int) to anon, authenticated;
