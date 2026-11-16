-- Showcase S3b: KI-Entwurf aus dem Fragebogen, Freigabe durch das Unternehmen.
--
--   * showcase_submissions: wann der Entwurf entstand, Hinweise fuer die
--     Redaktion (Laenge, Zitat, Investitionsbegriffe, entfernte Links), die
--     drei LinkedIn-Texte fuer das Unternehmen, wann «Entwurf bereit» und
--     «Beitrag ist online» verschickt wurden.
--   * Pro Beitrag hoechstens eine Einreichung (eindeutige Zuordnung beim
--     Publizieren).
--   * article_preview_links: Die Redaktion kann eine Freigabe auf die aktuelle
--     Fassung uebertragen, wenn sie nach der Freigabe nur noch Kleinigkeiten
--     geaendert hat (Tippfehler, Tags, Bildbeschreibung). Wer das wann getan
--     hat, steht in der Zeile.
--
-- Additiv: neue Spalten mit Default, ein Index.

alter table public.showcase_submissions
  add column if not exists draft_created_at timestamptz,
  add column if not exists draft_notes jsonb not null default '[]'::jsonb,
  add column if not exists linkedin_texts jsonb not null default '[]'::jsonb,
  add column if not exists draft_ready_sent_at timestamptz,
  add column if not exists online_sent_at timestamptz;

alter table public.showcase_submissions drop constraint if exists showcase_submissions_draft_notes_shape;
alter table public.showcase_submissions add constraint showcase_submissions_draft_notes_shape
  check (jsonb_typeof(draft_notes) = 'array' and jsonb_array_length(draft_notes) <= 20);

alter table public.showcase_submissions drop constraint if exists showcase_submissions_linkedin_shape;
alter table public.showcase_submissions add constraint showcase_submissions_linkedin_shape
  check (jsonb_typeof(linkedin_texts) = 'array' and jsonb_array_length(linkedin_texts) <= 3);

comment on column public.showcase_submissions.draft_notes is
  'Hinweise zum KI-Entwurf fuer die Redaktion (Liste von Texten).';
comment on column public.showcase_submissions.linkedin_texts is
  'Bis zu drei LinkedIn-Texte zum Beitrag, vom KI-Entwurf erzeugt, fuer das Unternehmen.';

create unique index if not exists showcase_submissions_one_per_article
  on public.showcase_submissions (article_id) where article_id is not null;

alter table public.article_preview_links
  add column if not exists editor_confirmed_at timestamptz,
  add column if not exists editor_confirmed_by uuid references public.authors(id) on delete set null;

comment on column public.article_preview_links.editor_confirmed_at is
  'Die Redaktion hat die Freigabe auf eine spaetere Fassung uebertragen (nur Kleinigkeiten geaendert).';
