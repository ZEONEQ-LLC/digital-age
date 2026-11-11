-- DB-Härtung: EXECUTE auf Funktionen im public-Schema eingrenzen.
-- Anlass: Supabase Security Advisor vom 11.11.2026 (Lints 0028/0029: 28
-- SECURITY-DEFINER-Funktionen per /rest/v1/rpc für anon und authenticated
-- ausführbar; Lint 0011: drei Funktionen ohne festen search_path).
--
-- Postgres gibt EXECUTE auf neue Funktionen an PUBLIC, Supabase zusätzlich
-- explizit an anon, authenticated und service_role. Darum: erst von public,
-- anon (und ggf. authenticated) entziehen, dann gezielt wieder erlauben.
-- service_role bleibt überall unverändert.
--
-- Gruppen (Aufrufer im Code geprüft, pg_policies und pg_depend gelesen):
--   A) Trigger-Funktionen. Niemand ruft sie direkt auf; Postgres prüft
--      EXECUTE nur beim CREATE TRIGGER, nicht beim Feuern. Darum entziehen
--      für alle API-Rollen. handle_new_user feuert in auth.users: dafür
--      explizit supabase_auth_admin (vorher über PUBLIC).
--   B) ad_campaign_coverage_gap: nur aus den Werbe-Triggern aufgerufen
--      (SECURITY DEFINER, laufen als Owner). Für API-Rollen entziehen.
--   C) Editor-RPCs mit eigener Rechteprüfung (is_editor bzw. Autoren-Check):
--      rename_tag, merge_tags, delete_tag, restore_article_revision,
--      regenerate_ad_preview_token. Nur noch authenticated.
--   D) RLS-Helfer is_editor, current_author_id, is_internal_author,
--      can_modify_article_image. Alle Policies, die sie benutzen, gelten nur
--      für authenticated (public- und storage-Schema). Nur noch authenticated.
--   E) SEO-Review-RPCs (SECURITY INVOKER, nur im Editor): save_seo_review,
--      update_seo_review_done. Nur noch authenticated.
--   F) Bewusst öffentlich, bleiben unverändert: get_invite_by_token
--      (Onboarding vor dem Login, Token ist der Schlüssel),
--      increment_prompt_uses (Kopier-Zähler, nur published/featured),
--      suggest_startup_slug (Startup-Einreichung, muss auch nicht
--      öffentliche Slugs sehen). Der Advisor meldet sie weiter.
--   G) get_top_tags wird SECURITY INVOKER: anon darf tags, article_tags und
--      publizierte Artikel per RLS ohnehin lesen, die Funktion filtert selbst
--      auf published. Ergebnis gleich, kein DEFINER nötig.
--   H) search_path fest setzen (Lint 0011).
--
-- Neue Funktionen: Regel in CLAUDE.md («Neue DB-Funktionen»).
-- Rückweg bei Problemen: grant execute on function … to anon, authenticated;

-- A) Trigger-Funktionen
revoke execute on function public.check_ad_advertiser_billing_agency() from public, anon, authenticated;
revoke execute on function public.check_ad_advertiser_in_use() from public, anon, authenticated;
revoke execute on function public.check_ad_booking_overlap() from public, anon, authenticated;
revoke execute on function public.check_ad_booking_sellable() from public, anon, authenticated;
revoke execute on function public.check_ad_campaign_activation() from public, anon, authenticated;
revoke execute on function public.check_ad_campaign_house_immutable() from public, anon, authenticated;
revoke execute on function public.check_ad_campaign_ready() from public, anon, authenticated;
revoke execute on function public.check_ad_campaign_utm_frozen() from public, anon, authenticated;
revoke execute on function public.check_ad_creative_still_needed() from public, anon, authenticated;
revoke execute on function public.check_prompt_status_transition() from public, anon, authenticated;
revoke execute on function public.check_startup_spotlight_limit() from public, anon, authenticated;
revoke execute on function public.check_startup_status_transition() from public, anon, authenticated;
revoke execute on function public.create_article_revision() from public, anon, authenticated;
revoke execute on function public.articles_set_updated_at() from public, anon, authenticated;
revoke execute on function public.compute_article_reading_stats() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.set_updated_at_newsletter() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- B) Nur intern
revoke execute on function public.ad_campaign_coverage_gap(uuid) from public, anon, authenticated;

-- C) Editor-RPCs
revoke execute on function public.rename_tag(uuid, text) from public, anon;
revoke execute on function public.merge_tags(uuid, uuid) from public, anon;
revoke execute on function public.delete_tag(uuid) from public, anon;
revoke execute on function public.restore_article_revision(uuid, uuid) from public, anon;
revoke execute on function public.regenerate_ad_preview_token(uuid) from public, anon;
grant execute on function public.rename_tag(uuid, text) to authenticated;
grant execute on function public.merge_tags(uuid, uuid) to authenticated;
grant execute on function public.delete_tag(uuid) to authenticated;
grant execute on function public.restore_article_revision(uuid, uuid) to authenticated;
grant execute on function public.regenerate_ad_preview_token(uuid) to authenticated;

-- D) RLS-Helfer
revoke execute on function public.is_editor() from public, anon;
revoke execute on function public.current_author_id() from public, anon;
revoke execute on function public.is_internal_author() from public, anon;
revoke execute on function public.can_modify_article_image(text) from public, anon;
grant execute on function public.is_editor() to authenticated;
grant execute on function public.current_author_id() to authenticated;
grant execute on function public.is_internal_author() to authenticated;
grant execute on function public.can_modify_article_image(text) to authenticated;

-- E) SEO-Review-RPCs
revoke execute on function public.save_seo_review(uuid, jsonb) from public, anon;
revoke execute on function public.update_seo_review_done(uuid, jsonb) from public, anon;
grant execute on function public.save_seo_review(uuid, jsonb) to authenticated;
grant execute on function public.update_seo_review_done(uuid, jsonb) to authenticated;

-- G) get_top_tags ohne DEFINER
alter function public.get_top_tags(integer) security invoker;

-- H) search_path
alter function public.set_updated_at() set search_path = public;
alter function public.set_updated_at_newsletter() set search_path = public;
alter function public.compute_article_reading_stats() set search_path = public;
