-- Phase 7 Session E — SEO-Felder und Tags-Array auf articles
--
-- Editor zeigt SEO-Tab und Tags-Input — diese Felder werden persistiert.
-- Analytics-Felder (views, reads, completion) werden bewusst NICHT ergänzt —
-- ohne echte Event-Tracking-Integration wären sie für immer 0.

alter table public.articles
  add column seo_title text,
  add column seo_description text,
  add column seo_keyword text,
  add column tags text[] not null default '{}';

create index idx_articles_tags on public.articles using gin(tags);

comment on column public.articles.seo_title is 'Optionaler SEO-Title-Override, sonst wird title verwendet';
comment on column public.articles.seo_description is 'Optionale SEO-Meta-Description';
comment on column public.articles.seo_keyword is 'Optionaler primärer SEO-Keyword (single, nicht array)';
comment on column public.articles.tags is 'Free-form Tags-Array für Tag-Filter und Search (Phase 8)';
