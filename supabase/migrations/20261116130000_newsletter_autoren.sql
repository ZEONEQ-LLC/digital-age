-- Newsletter fuer Autorinnen und Autoren (Wunsch Ali 16.11.2026): Wer fuer
-- digital age schreibt und ein Konto hat, bekommt den Newsletter automatisch.
--
--   * source kennt neu 'author': So bleibt nachvollziehbar, wer ueber ein
--     Formular kam und wer als Autorin oder Autor eingetragen wurde.
--   * author_id verknuepft die Zeile mit dem Autorenprofil. Pro Profil
--     hoechstens eine Zeile. Daran erkennt der Abgleich, dass jemand schon
--     eingetragen ist oder sich abgemeldet hat, auch wenn sich die
--     E-Mail-Adresse im Profil spaeter aendert.
--
-- Eingetragen wird im Code (src/lib/newsletter/authorSubscribers.ts), beim
-- Erstellen eines Entwurfs und vor dem Versand. Abgemeldete bleiben abgemeldet.
--
-- Additiv: Der CHECK kennt einen Wert mehr, eine neue Spalte, ein Index.

alter table public.newsletter_subscribers
  drop constraint newsletter_subscribers_source_check;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_source_check
  check (source in ('footer', 'inline', 'full', 'sidebar', 'author'));

alter table public.newsletter_subscribers
  add column if not exists author_id uuid references public.authors(id) on delete set null;

comment on column public.newsletter_subscribers.author_id is
  'Autorenprofil, wenn die Zeile zu einer Autorin oder einem Autor gehoert (automatisch eingetragen oder nachtraeglich verknuepft).';

create unique index if not exists newsletter_subscribers_author_idx
  on public.newsletter_subscribers (author_id) where author_id is not null;
