-- Bestandsdaten-Bereinigung (2. Runde): entfernte Modell-IDs in ai_config
-- auf ihre Nachfolger mappen. Hintergrund: die kuratierte Liste in
-- src/lib/ai/models.ts wurde auf die Claude-5.5-Generation aktualisiert.
-- Falls ein Editor ueber die Admin-UI (/autor/admin/ai-config) noch eine
-- entfernte ID als default_model oder in task_model_overrides gesetzt hat,
-- wird sie hier auf die neue ID gemappt (sonst "(unbekannt)" in der UI und
-- Override-Fallback auf default_model im Resolver).
--
--   claude-haiku-4-5 -> claude-haiku-5-5
--   claude-sonnet-5  -> claude-sonnet-5-5
--   claude-opus-4-8  -> claude-opus-5-5
--   claude-fable-5   -> claude-fable-5-1
--
-- Idempotent: trifft NUR Rows/Keys mit einer der alten IDs; No-op falls
-- keine vorhanden. Explizite Transaktion. Betrifft ausschliesslich die
-- Config-Singleton-Row (default_model + task_model_overrides).
-- Muster: 20260707120000_ai_config_model_ids_cleanup.sql
--
-- WICHTIG: ai_usage_log.model bleibt unangetastet — das ist das
-- historische Kosten-Hauptbuch und MUSS widerspiegeln, welches Modell
-- tatsaechlich lief.

begin;

-- 1) default_model direkt mappen (nur wenn betroffen, kein Leerlauf-Update).
update public.ai_config
set default_model = case default_model
      when 'claude-haiku-4-5' then 'claude-haiku-5-5'
      when 'claude-sonnet-5'  then 'claude-sonnet-5-5'
      when 'claude-opus-4-8'  then 'claude-opus-5-5'
      when 'claude-fable-5'   then 'claude-fable-5-1'
      else default_model
    end,
    updated_at = now()
where default_model in (
  'claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-4-8', 'claude-fable-5'
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
            when 'claude-haiku-4-5' then '"claude-haiku-5-5"'::jsonb
            when 'claude-sonnet-5'  then '"claude-sonnet-5-5"'::jsonb
            when 'claude-opus-4-8'  then '"claude-opus-5-5"'::jsonb
            when 'claude-fable-5'   then '"claude-fable-5-1"'::jsonb
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
    'claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-4-8', 'claude-fable-5'
  )
);

commit;

-- ROLLBACK: nicht rueckabwickelbar (die alten IDs sind ueberschrieben).
-- Kein Datenverlust ausserhalb der vier gemappten ID-Strings.
