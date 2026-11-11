-- Pitch -> Artikel-Entwurf (Backlog 13.07.2026). Merkt sich am Pitch den daraus
-- erzeugten Entwurf: Der Knopf im Pitch-Modal wird dann zu «Entwurf öffnen», ein
-- zweiter Klick legt keinen doppelten Entwurf an. Wird der Artikel geloescht,
-- faellt die Verknuepfung weg und der Pitch kann neu uebernommen werden.
-- Additiv.
--
-- Rollback (Doku):
--   alter table public.article_pitches drop column if exists article_id;
alter table public.article_pitches
  add column article_id uuid null references public.articles(id) on delete set null;

comment on column public.article_pitches.article_id is
  'Aus diesem Pitch erzeugter Artikel-Entwurf. null = noch keiner.';
