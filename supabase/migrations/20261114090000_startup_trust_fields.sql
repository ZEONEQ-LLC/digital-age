-- Swiss AI S1 (Verzeichnis-Hygiene, Übergabe «Swiss AI Showcase» 13.11.2026):
--   * affiliation_note: Verbindung zum Herausgeber offenlegen («Mit dem
--     Herausgeber verbunden» auf Karte, Zeile, Startseiten-Streifen, Profil).
--   * verified_at: «Daten bestätigt am» (Knopf im Admin), bewusst nicht
--     updated_at.
-- Beide Spalten sind öffentlich: anon liest ai_startups seit PR 194 nur über
-- Spaltenrechte (20261112100000), darum hier dasselbe GRANT. Ohne es würde
-- select(PUBLIC_STARTUP_COLUMNS) für alle Besucher scheitern.
-- Additiv; die Daten unten liest erst der neue Code (Ausnahme: die Stadt).

alter table public.ai_startups
  add column if not exists affiliation_note text check (affiliation_note is null or char_length(affiliation_note) <= 300),
  add column if not exists verified_at timestamptz;

grant select (affiliation_note, verified_at) on public.ai_startups to anon;

comment on column public.ai_startups.affiliation_note is 'Offenlegung einer Verbindung zum Herausgeber; gesetzt = Hinweis «Mit dem Herausgeber verbunden».';
comment on column public.ai_startups.verified_at is 'Wann Unternehmen oder Redaktion die Angaben zuletzt bestätigt haben.';

-- Offenlegung (Diagnose 13.11.2026: Connect AI Group und ZEONEQ GmbH).
update public.ai_startups
   set affiliation_note = 'Ali Soy, Herausgeber von digital age, ist CGO der Connect AI Group GmbH.'
 where slug = 'connect-ai-group-gmbh' and affiliation_note is null;
update public.ai_startups
   set affiliation_note = 'Die ZEONEQ GmbH ist mit Ali Soy, dem Herausgeber von digital age, verbunden.'
 where slug = 'zeoneq-gmbh' and affiliation_note is null;

-- Stadt kanonisch (gleiche Regel wie normalizeCity in src/lib/startupCity.ts).
update public.ai_startups set city = 'Zürich' where city = 'Zurich';

-- Rollback:
-- revoke select (affiliation_note, verified_at) on public.ai_startups from anon;
-- alter table public.ai_startups drop column if exists affiliation_note, drop column if exists verified_at;
