-- Co-Pilot-Modus Phase 1: Report des letzten Laufs pro Artikel.
--
-- articles.copilot_last_run jsonb (nullable). Struktur (vom Client geschrieben):
--   { started_at, finished_at, steps: [{ step, status:'ok'|'skipped'|'failed', detail }] }
--
-- BEWUSST NICHT im Revisions-Snapshot (siehe REVISION_SNAPSHOT_FIELDS) — reiner
-- Status/Report, kein redaktioneller Inhalt. Steht NICHT in der
-- create_article_revision-Feldliste, loest also keine content-Revision aus.
-- Wird als Teil des abschliessenden Co-Pilot-saveArticle-Patches geschrieben.

alter table public.articles
  add column copilot_last_run jsonb;

-- ROLLBACK (auskommentiert, nur als Doku):
-- alter table public.articles drop column if exists copilot_last_run;
