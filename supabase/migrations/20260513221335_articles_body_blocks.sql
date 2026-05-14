-- Phase 8b/c — Strukturierte Block-Persistenz für den Article-Editor.
--
-- Modell:
--   - body_blocks (jsonb, nullable) ist die Source-of-Truth für Artikel,
--     die im Visual-Editor erstellt oder migriert wurden. Inhalt ist ein
--     BlockDocument-Objekt: { version, blocks, sources }.
--   - body_md bleibt als simplifizierte, suchbare/RSS-taugliche Darstellung
--     erhalten. Bei jedem saveArticle mit body_blocks-Patch wird body_md
--     server-seitig aus body_blocks regeneriert (Renderer in
--     src/lib/blockDocumentMarkdown.ts). Special-Blocks (StatBox, Disclaimer,
--     InternalArticleCard) landen als Platzhalter-Text im body_md.
--
--   - body_blocks IS NULL → Legacy-Artikel, der nur body_md hat. Der Editor
--     parsed body_md beim ersten Visual-Open einmalig zu Blocks (mit User-
--     Confirmation-Modal) und persistiert auf dem ersten Save.
--
-- Kein Index: body_blocks wird immer als Ganzes gelesen, nicht gefiltert.
-- Kein check-Constraint auf JSON-Struktur: Validierung läuft via TypeScript
-- in saveArticle, nicht in der DB.

alter table public.articles
  add column body_blocks jsonb;
