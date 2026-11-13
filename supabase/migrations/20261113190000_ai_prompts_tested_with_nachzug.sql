-- Nachzug zu 20261113181000: Ein Prompt-Lauf um 17:00 UTC (13.11.2026) lief
-- noch mit dem Code vor PR 203 (Admin-Seite vor dem Deploy geladen) und trug
-- wieder «claude» ein. Gleiche Regel, idempotent. Nur Daten; nach dem Merge
-- pushen.

update public.ai_prompts
   set tested_with = 'mehrere'
 where ai_generated = true
   and tested_with = 'claude';
