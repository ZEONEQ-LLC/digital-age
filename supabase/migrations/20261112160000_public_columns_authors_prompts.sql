-- Datenschutz (Befund 12.11.2026): E-Mail-Adressen von Autoren und
-- Prompt-Einreichern waren ueber die oeffentliche REST-API lesbar.
--
-- Gleiche Ursache wie bei den Startups (20261112100000): Die Policies
-- geben Zeilen frei (authors: alle Profile; ai_prompts: published/featured),
-- und anon hatte SELECT auf alle Spalten. RLS filtert nur Zeilen, nicht
-- Spalten. Betroffen: authors.email (17 Profile, auch Gastautoren aus
-- Pitches) und ai_prompts.submitter_email (2 publizierte Prompts). Die Website
-- zeigt beides nirgends.
--
-- Fix: anon verliert das Tabellen-SELECT und bekommt es nur fuer die
-- oeffentlichen Spalten zurueck (Listen = PUBLIC_AUTHOR_COLUMNS in
-- src/lib/authorApi.ts und PUBLIC_PROMPT_COLUMNS in src/lib/promptApi.ts).
-- authors.user_id bleibt lesbar: Sitemap (nur geclaimte Profile) und die
-- Policies mit user_id = auth.uid() (Rolle public) brauchen es; die
-- Auth-UUID ist kein Kontaktdatum. Bei ai_prompts bleiben submitter_name und
-- submitter_url lesbar, sie stehen als Nennung auf der Prompt-Seite.
--
-- Nicht additiv: Ein select("*") am Anon-Client scheitert danach. Der Code
-- liest seit diesem PR nur noch die oeffentlichen Spalten; deshalb erst nach
-- dem Deploy pushen. authenticated bleibt unveraendert (Suite und Admin).
-- Die Einreichung (anon INSERT ohne Rueckgabe) ist nicht betroffen.
--
-- Rueckweg:
--   grant select on public.authors to anon;
--   grant select on public.ai_prompts to anon;

revoke select on public.authors from anon;

grant select (
  id, slug, handle, display_name, bio, avatar_url, job_title, location,
  social_links, joined_at, role, user_id, created_at, updated_at
) on public.authors to anon;

revoke select on public.ai_prompts from anon;

grant select (
  id, slug, title, category, context, prompt_text, example_output,
  tested_with, difficulty, status, author_id, submitter_name, submitter_url,
  uses_count, published_at, created_at, updated_at
) on public.ai_prompts to anon;
