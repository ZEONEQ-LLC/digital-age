-- PR-A — articles.locale + Backfill.
--
-- (1) Additive Spalte `locale` auf public.articles. CHECK constraint
--     beschränkt auf die zwei aktuell unterstützten Werte. Default
--     'de-CH' deckt den Hauptbestand ab — die zwei en-Authors werden
--     gleich darunter über die Author-Mail-Map auf 'en' gesetzt.
--
-- (2) Backfill: alle Artikel von Andreas Kamm (kay68zurich@gmail.com)
--     und Emanuele Laurenzi (manulaurenzi@gmail.com) auf 'en'.
--     Author-Mail-Map ist die Source-of-Truth — display_name ist
--     veränderlich und nicht eindeutig genug. Mail-Existenz wurde
--     vor dem Migrations-Run gegen Prod verifiziert (beide Rows da,
--     17 + 1 = 18 Artikel insgesamt).

alter table public.articles
  add column locale text not null default 'de-CH'
  check (locale in ('de-CH', 'en'));

update public.articles
  set locale = 'en'
  where author_id in (
    select id from public.authors
    where email in ('kay68zurich@gmail.com', 'manulaurenzi@gmail.com')
  );

-- ROLLBACK (auskommentiert, nur als Doku):
-- alter table public.articles drop constraint if exists articles_locale_check;
-- alter table public.articles drop column if exists locale;
