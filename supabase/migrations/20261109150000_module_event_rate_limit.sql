-- Werbung: IP-Rate-Limit fuer den Ereignis-POST /api/module/[code]
-- (Backlog 23.09.2026). Der POST ist oeffentlich und ohne Identitaet; bisher
-- schuetzen nur HMAC-Token (6 h), isbot und Body-Limit. Neu zaehlt der Code
-- Ereignisse pro IP-Hash im Fenster (Muster newsletter-Rate-Limit, Migration
-- 20260515173722): Tabelle newsletter_signup_attempts, neue Aktion
-- 'module_event'. IP-Hash (SHA-256 mit Server-Salt) bleibt hoechstens 24 h
-- (opportunistisches Cleanup in logAttempt). Additiv: nur der CHECK waechst.
--
-- Rollback (Doku):
--   alter table public.newsletter_signup_attempts drop constraint newsletter_signup_attempts_action_check;
--   alter table public.newsletter_signup_attempts add constraint newsletter_signup_attempts_action_check
--     check (action in ('subscribe', 'unsubscribe', 'contact', 'pitch', 'podcast_ingest'));
alter table public.newsletter_signup_attempts
  drop constraint newsletter_signup_attempts_action_check;
alter table public.newsletter_signup_attempts
  add constraint newsletter_signup_attempts_action_check
  check (action in ('subscribe', 'unsubscribe', 'contact', 'pitch', 'podcast_ingest', 'module_event'));
