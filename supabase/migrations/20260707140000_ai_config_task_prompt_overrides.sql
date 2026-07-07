-- SEO-Prompt-Verwaltung (PR 2): editierbare Strategie-Teile der SEO-Prompts.
--
-- Neue jsonb-Spalte auf dem ai_config-Singleton, symmetrisch zu
-- task_model_overrides. Haelt pro Prompt-ID den editierbaren Strategie-Text:
--   { "seo_keyword_candidates": "...", "seo_derive": "...", "seo_review": "..." }
--
-- Prompt-ID-Schluesselraum ist BEWUSST nicht die AiTask-Enum (seo_pipeline
-- sind zwei Prompts). Fehlender/leerer Wert -> der Builder faellt auf den
-- Code-Default (Muster wie news_ticker_config.generation_prompt). Kein
-- Backfill noetig; Default '{}' = alle Prompts auf Code-Standard.
--
-- Das JSON-Schema/Output-Format der Prompts bleibt in Code — nur der
-- Strategie-Text ist editierbar.

alter table public.ai_config
  add column task_prompt_overrides jsonb not null default '{}'::jsonb;

-- ROLLBACK (auskommentiert, nur als Doku):
-- alter table public.ai_config drop column if exists task_prompt_overrides;
