-- Modell-Check: Preis fuer Claude Fable 5.2 (Backlog-Karte «Fable 5.2: Preis
-- klaeren»). Beim Seed (20261111220000) stand Fable 5.2 nur in der
-- Modelluebersicht, nicht auf der Preisseite. Stand 12.11.2026 listet die
-- Preisseite 8 USD Input / 40 USD Output pro Million Tokens (Ankuendigung
-- vom 09.11.2026: guenstiger als Fable 5.1 mit 10/50). Vision und
-- seen_in_api_at fuellt der naechste Lauf aus der Models API.
--
-- Reine Datenaenderung, idempotent. Rueckweg: Preise wieder auf null.

update public.ai_model_catalog
set input_usd_per_mtok = 8.00,
    output_usd_per_mtok = 40.00,
    released_at = coalesce(released_at, date '2026-11-09'),
    source = 'Anthropic-Preisseite',
    checked_at = date '2026-11-12'
where model_id = 'claude-fable-5-2';
