-- KI-Deklaration fuer Podcasts: ai_generated (Default false). Analog zum
-- KI-Transparenz-Hinweis bei Artikeln. Bestehende self-hosted Episoden sind
-- NotebookLM-generiert -> per Update auf true setzen.
alter table public.podcasts
  add column ai_generated boolean not null default false;

update public.podcasts
set ai_generated = true
where source_type = 'self_hosted';

-- Rollback:
-- alter table public.podcasts drop column ai_generated;
