-- Anzeigen im Newsletter: eigene Rate-Limit-Aktion fuer die Zaehl-Weiterleitung
-- (/api/module/weiter). Getrennt von 'module_event' (Einblendungen und Klicks
-- der Website), damit ein Vielleser der Website nicht aus der Zaehlung faellt
-- und das Limit fuer Mail-Klicks enger sein kann.
--
-- Additiv: Der CHECK kennt einen Wert mehr.

alter table public.newsletter_signup_attempts
  drop constraint newsletter_signup_attempts_action_check;
alter table public.newsletter_signup_attempts
  add constraint newsletter_signup_attempts_action_check
  check (action in ('subscribe', 'unsubscribe', 'contact', 'pitch', 'podcast_ingest', 'module_event', 'startup_contact', 'showcase_submit', 'showcase_upload', 'preview_response', 'article_read', 'newsletter_ad_click'));
