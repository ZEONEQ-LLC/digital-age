-- Prompts der KI-Redaktion: «Tool» Mehrere statt Claude (Ali 13.11.2026:
-- «wieso sind die neuen KI-Prompts nur für Claude gut?»). Die Prompts sind
-- fuer alle gaengigen Assistenten geschrieben; mit Claude laeuft nur das
-- Beispiel, das sagt die Detailseite. Neue setzt der Job seit PR 203 selbst
-- (src/lib/promptGen/job.ts). Nur Daten, keine Schemaaenderung; erst nach dem
-- Merge pushen.

update public.ai_prompts
   set tested_with = 'mehrere'
 where ai_generated = true
   and tested_with = 'claude';

-- Rollback (nur falls noetig):
-- update public.ai_prompts set tested_with = 'claude' where ai_generated = true and tested_with = 'mehrere';
