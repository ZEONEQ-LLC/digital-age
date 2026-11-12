-- Datenschutz (PR 194): Einreicher-Daten der Startups nicht mehr öffentlich.
--
-- Befund 11.11.2026: Die Policy ai_startups_public_read (Rolle public) gibt
-- publizierte Zeilen frei, und anon hatte SELECT auf alle Spalten. Damit
-- waren submitter_name, submitter_email und submitter_role publizierter
-- Startups über die öffentliche REST-API lesbar (2 Zeilen betroffen), obwohl
-- die Website sie nirgends zeigt. RLS filtert nur Zeilen, nicht Spalten,
-- darum hier Spaltenrechte: anon verliert das Tabellen-SELECT und bekommt es
-- nur für die öffentlichen Spalten zurück (Liste = PUBLIC_STARTUP_COLUMNS in
-- src/lib/startupApi.ts). Das INSERT der Einreichung (ohne Rückgabe) und die
-- RPC suggest_startup_slug sind nicht betroffen.
--
-- Nicht additiv: Ein select("*") am Anon-Client scheitert danach. Der Code
-- aus PR 194 liest nur noch die öffentlichen Spalten; deshalb erst nach dem
-- Deploy pushen. authenticated bleibt unverändert (Editoren brauchen alle
-- Spalten im Admin über den Session-Client).
--
-- Rückweg: grant select on public.ai_startups to anon;

revoke select on public.ai_startups from anon;

grant select (
  id, slug, name, tagline, description, website, logo_url, swiss_status,
  industry, city, employee_range, founded_year, funding_stage,
  total_funding_range, last_round_at, open_to_investment, pitch_deck_url,
  founder_names, status, published_at, created_at, updated_at
) on public.ai_startups to anon;
