-- Phase 7 Session E — recommended_by_note + related_article_slug auf podcasts
--
-- PodcastForm zeigt optionale Felder für eine kursive Empfehlungs-Quote
-- ("Wieso ich das empfehle...") und einen Slug-Bezug zu einem zugehörigen
-- Article. Schema bekommt beide Felder.

alter table public.podcasts
  add column recommended_by_note text,
  add column related_article_slug text;

create index idx_podcasts_related_article_slug on public.podcasts(related_article_slug)
  where related_article_slug is not null;

comment on column public.podcasts.recommended_by_note is 'Optionale Empfehlungs-Quote vom Recommender, max ~280 Zeichen UI-seitig';
comment on column public.podcasts.related_article_slug is 'Optionaler Slug eines zugehörigen Articles (loose Referenz, kein FK)';
