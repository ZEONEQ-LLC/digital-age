-- Hardening: EXECUTE-Grants auf Projekt-Muster bringen.
--
-- Postgres grantet bei CREATE FUNCTION per Default EXECUTE an PUBLIC (inkl.
-- anon). Die drei jüngeren RPCs (save_seo_review, update_seo_review_done,
-- restore_article_revision) haben zwar ein explizites `grant … to
-- authenticated`, aber NICHT das `revoke all … from public`, das die älteren
-- RPCs (suggest_startup_slug, get_invite_by_token, increment_prompt_uses)
-- haben. Kein Exploit — alle drei sind über auth.uid()/RLS gegatet und geben
-- für anon nur `false`/leer zurück, ohne Mutation — aber Abweichung vom
-- Muster und unnötige anon-Angriffsfläche.
--
-- Rein additiv-restriktiv: entzieht nur PUBLIC das EXECUTE. Der bestehende
-- explizite `grant … to authenticated` (aus den jeweiligen Ursprungs-
-- Migrationen) bleibt unberührt. Kein Code liest davon — Reihenfolge
-- gegenüber Code-Deploy unkritisch.

revoke all on function public.save_seo_review(uuid, jsonb) from public;
revoke all on function public.update_seo_review_done(uuid, jsonb) from public;
revoke all on function public.restore_article_revision(uuid, uuid) from public;

-- ROLLBACK (auskommentiert, nur als Doku — stellt den Default-PUBLIC-Grant
-- wieder her):
-- grant execute on function public.save_seo_review(uuid, jsonb) to public;
-- grant execute on function public.update_seo_review_done(uuid, jsonb) to public;
-- grant execute on function public.restore_article_revision(uuid, uuid) to public;
