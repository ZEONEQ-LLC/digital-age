-- Multi-Keyword-Schema-Vorbereitung.
--
-- (1) seo_keyword wird zu seo_keyword_primary umbenannt (semantische
--     Schärfung: in einer Multi-Keyword-Welt ist das EINE bestehende
--     Keyword das Primary).
-- (2) seo_keywords_secondary text[] neu, default empty. Wird in einem
--     späteren PR im Editor + Pipeline + Review ausgebaut.
--
-- Bestehende Werte bleiben unangetastet — der Rename ist Spalten-Level,
-- keine Daten-Transformation.

alter table public.articles
  rename column seo_keyword to seo_keyword_primary;

alter table public.articles
  add column seo_keywords_secondary text[] not null default '{}'::text[];

-- Doku-Comment auf der renamed-Spalte anpassen (vorher: "Optionaler
-- primärer SEO-Keyword (single, nicht array)" — passt nach Rename eh
-- besser).
comment on column public.articles.seo_keyword_primary is
  'Optionaler primärer SEO-Keyword (single string). Multi-Keyword-Ausbau via seo_keywords_secondary.';
comment on column public.articles.seo_keywords_secondary is
  'Optionale Sekundär-Keywords (text[]); leeres Array = keine. Editor-UI folgt in eigenem PR.';

-- ROLLBACK (auskommentiert, nur als Doku):
-- alter table public.articles drop column if exists seo_keywords_secondary;
-- alter table public.articles rename column seo_keyword_primary to seo_keyword;
