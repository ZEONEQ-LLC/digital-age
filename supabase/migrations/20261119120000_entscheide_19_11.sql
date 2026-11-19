-- Entscheide von Ali (19.11.2026). Nur Daten, keine Schemaaenderung; nach
-- dem Merge pushen. Jede Aenderung greift nur, wenn der Datensatz noch so
-- aussieht wie heute (sonst bleibt er unveraendert).
--
-- 1. Modell-Katalog: Preise fuer Claude Opus 5, Opus 4.5 und Sonnet 4.5
--    (Anthropic-Preisseite, 19.11.2026). Der Modell-Check meldete sie als
--    «ohne Preis».
-- 2. Strategie seo_review: Der DB-Override weicht vom Code nur noch in der
--    Sprachregel fuer Powerwords ab; die steht jetzt im Code-Standard. Der
--    Override faellt weg, damit auch der H3-Hinweis gilt.
-- 3. KI-Transparenz: Der Satz «KI erhält keinen Zugriff auf persönliche
--    oder vertrauliche Daten» stimmte seit dem Showcase nicht mehr ganz
--    (ein Zitat mit Name und Funktion geht an die KI).
-- 4. KI-Plattformen: Preisseite fuer Stable Diffusion; Swiss GPT verlinkte
--    auf eine Seite, die es nicht mehr gibt (404).

-- 1
update public.ai_model_catalog
   set input_usd_per_mtok = v.input_price,
       output_usd_per_mtok = v.output_price,
       source = 'Anthropic-Preisseite',
       checked_at = date '2026-11-19',
       updated_at = now()
  from (values
    ('claude-opus-5', 5.0, 25.0),
    ('claude-opus-4-5', 5.0, 25.0),
    ('claude-sonnet-4-5', 3.0, 15.0)
  ) as v(model_id, input_price, output_price)
 where ai_model_catalog.model_id = v.model_id
   and ai_model_catalog.input_usd_per_mtok is null
   and ai_model_catalog.output_usd_per_mtok is null;

-- 2
update public.ai_config
   set task_prompt_overrides = task_prompt_overrides - 'seo_review'
 where id = 'global'
   and md5(task_prompt_overrides ->> 'seo_review') = 'b364553bc715b955c87532b96713b403';

-- 3
update public.pages
   set body_blocks = replace(
         body_blocks::text,
         '"KI erhält keinen Zugriff auf persönliche oder vertrauliche Daten."',
         '"KI erhält keine Daten unserer Leserinnen und Leser und nichts Vertrauliches. Angaben zu Personen gehen nur an die KI, wenn sie ohnehin veröffentlicht werden, etwa ein Zitat mit Name und Funktion in einem Showcase-Beitrag."'
       )::jsonb
 where slug = 'ki-transparenz'
   and body_blocks::text like '%"KI erhält keinen Zugriff auf persönliche oder vertrauliche Daten."%';

-- 4
update public.ai_platforms
   set pricing_url = 'https://platform.stability.ai/pricing',
       page_hash = null
 where slug = 'stable-diffusion'
   and pricing_url is null;

update public.ai_platforms
   set url = 'https://alpineai.swiss/en/swissgpt',
       page_hash = null
 where slug = 'swiss-gpt'
   and url = 'https://alpineai.swiss/en';
