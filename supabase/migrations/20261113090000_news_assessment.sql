-- Einordnung der News-Meldungen (Entscheid Ali 13.11.2026): Die KI des
-- Tickers schaetzt jede Meldung grob ein, auf vier Feldern (Wirtschaft,
-- Gesellschaft, Umwelt, Dringlichkeit) mit den Stufen 0 = nicht betroffen,
-- 1 = gering, 2 = mittel, 3 = hoch, dazu ein Satz «warum wichtig fuer die
-- DACH-Region». Die Wichtigkeit (1 bis 3) liegt als eigene Spalte daneben,
-- weil Startseite und /news damit «Wichtig» markieren (spaeter sortieren).
--
-- assessment: { "v": 1, "wirtschaft": 0..3, "gesellschaft": 0..3,
--   "umwelt": 0..3, "dringlichkeit": 0..3, "warum": text, "by": "ai"|"editor" }
--
-- Additiv: zwei nullable Spalten. anon liest news_items mit Tabellenrecht
-- (RLS: nur approved), die neuen Spalten sind damit lesbar wie die anderen.

alter table public.news_items
  add column assessment jsonb,
  add column importance smallint check (importance between 1 and 3);

comment on column public.news_items.assessment is
  'KI-Einordnung (Ticker): Stufen 0-3 fuer wirtschaft, gesellschaft, umwelt, dringlichkeit, Satz warum; by = ai | editor.';
comment on column public.news_items.importance is
  'Wichtigkeit 1-3 aus der Einordnung; 3 = «Wichtig» auf Startseite und /news.';

-- Rollback (auskommentiert, nur als Doku):
-- alter table public.news_items drop column if exists importance;
-- alter table public.news_items drop column if exists assessment;
