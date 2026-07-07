-- Bestandsdaten-Bereinigung: entfernte Modell-IDs in ai_config auf ihre
-- Nachfolger mappen. Hintergrund: die kuratierte Liste in
-- src/lib/ai/models.ts wurde aktualisiert (Sonnet 4.6 -> Sonnet 5,
-- Opus 4.6/4.7 -> Opus 4.8, neu: Fable 5). Falls ein Editor ueber die
-- Admin-UI (/autor/admin/ai-config) noch eine entfernte ID als
-- default_model oder in task_model_overrides gesetzt hat, wird sie hier
-- auf die neue ID gemappt.
--
--   claude-opus-4-6   -> claude-opus-4-8
--   claude-opus-4-7   -> claude-opus-4-8
--   claude-sonnet-4-6 -> claude-sonnet-5
--
-- Idempotent: trifft NUR Rows/Keys mit einer der alten IDs; No-op falls
-- keine vorhanden. Explizite Transaktion. Betrifft ausschliesslich die
-- Config-Singleton-Row (default_model + task_model_overrides).
--
-- WICHTIG: ai_usage_log.model bleibt unangetastet — das ist das
-- historische Kosten-Hauptbuch und MUSS widerspiegeln, welches Modell
-- tatsaechlich lief.

begin;

-- 1) default_model direkt mappen (nur wenn betroffen, kein Leerlauf-Update).
update public.ai_config
set default_model = case default_model
      when 'claude-opus-4-6' then 'claude-opus-4-8'
      when 'claude-opus-4-7' then 'claude-opus-4-8'
      when 'claude-sonnet-4-6' then 'claude-sonnet-5'
      else default_model
    end,
    updated_at = now()
where default_model in (
  'claude-opus-4-6', 'claude-opus-4-7', 'claude-sonnet-4-6'
);

-- 2) task_model_overrides: jeden JSONB-Wert mappen, der eine entfernte ID
--    ist. Nicht-betroffene Keys bleiben unveraendert. Guard via EXISTS,
--    damit updated_at nur bei tatsaechlicher Aenderung neu gesetzt wird.
update public.ai_config c
set task_model_overrides = (
      select coalesce(
        jsonb_object_agg(
          e.key,
          case e.value #>> '{}'
            when 'claude-opus-4-6'   then '"claude-opus-4-8"'::jsonb
            when 'claude-opus-4-7'   then '"claude-opus-4-8"'::jsonb
            when 'claude-sonnet-4-6' then '"claude-sonnet-5"'::jsonb
            else e.value
          end
        ),
        '{}'::jsonb
      )
      from jsonb_each(c.task_model_overrides) e
    ),
    updated_at = now()
where exists (
  select 1
  from jsonb_each(c.task_model_overrides) e
  where e.value #>> '{}' in (
    'claude-opus-4-6', 'claude-opus-4-7', 'claude-sonnet-4-6'
  )
);

commit;

-- ROLLBACK: nicht rueckabwickelbar (die alten IDs sind ueberschrieben).
-- Kein Datenverlust ausserhalb der drei gemappten ID-Strings.
