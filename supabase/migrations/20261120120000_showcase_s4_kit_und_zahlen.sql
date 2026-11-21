-- Showcase S4: Teil-Kit und Zahlen fuer Unternehmensbeitraege. Additiv.
--
-- 1. Klicks auf die Website des Unternehmens zaehlen in der Lesestatistik
--    (Aktion 'website', wie 'share' und 'listen'): neue Spalte, die RPC nimmt
--    die Aktion an. Gezaehlt wird fuer alle Beitraege, sinnvoll ist sie nur
--    bei Unternehmensbeitraegen (der Zaehler meldet sie nur dort).
-- 2. Einreichungen bekommen einen zweiten Zugang fuer das Teil-Kit
--    (kit_token, getrennt vom Fragebogen-Token, der nach dem Absenden nichts
--    mehr oeffnet) und den Versandvermerk des 30-Tage-Berichts.

alter table public.article_stats_daily
  add column website_clicks integer not null default 0 check (website_clicks >= 0);

comment on column public.article_stats_daily.website_clicks is
  'Klicks auf Links zur Website des Unternehmens (nur Unternehmensbeitraege melden sie). Hoechstens einer pro Aufruf.';

alter table public.showcase_submissions
  add column kit_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  add column report_sent_at timestamptz;

comment on column public.showcase_submissions.kit_token is
  'Zugang zum Teil-Kit /showcase/teilen/<kit_token> (ohne Login, nur lesend).';
comment on column public.showcase_submissions.report_sent_at is
  'Versand des 30-Tage-Berichts an die Kontaktadresse (einmal).';

create or replace function public.article_stats_record(
  p_article uuid,
  p_view boolean default false,
  p_read boolean default false,
  p_seconds integer default 0,
  p_d25 boolean default false,
  p_d50 boolean default false,
  p_d75 boolean default false,
  p_d100 boolean default false,
  p_action text default null,
  p_source text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seconds integer := least(greatest(coalesce(p_seconds, 0), 0), 900);
  v_view integer := case when coalesce(p_view, false) then 1 else 0 end;
  v_source text;
begin
  if p_action is not null and p_action not in ('share', 'listen', 'website') then
    raise exception 'article_stats_record: unbekannte Aktion' using errcode = 'invalid_parameter_value';
  end if;
  if p_source is not null and p_source not in ('search', 'social', 'mail', 'ai', 'internal', 'direct', 'other') then
    raise exception 'article_stats_record: unbekannte Herkunft' using errcode = 'invalid_parameter_value';
  end if;
  if not exists (select 1 from public.articles a where a.id = p_article and a.status = 'published') then
    return false;
  end if;
  v_source := case when v_view = 1 then coalesce(p_source, 'other') end;

  insert into public.article_stats_daily as s (
    article_id, day, views, reads, seconds, d25, d50, d75, d100, shares, listens, website_clicks,
    src_search, src_social, src_mail, src_ai, src_internal, src_direct, src_other
  )
  values (
    p_article,
    (now() at time zone 'Europe/Zurich')::date,
    v_view,
    case when coalesce(p_read, false) then 1 else 0 end,
    v_seconds,
    case when coalesce(p_d25, false) then 1 else 0 end,
    case when coalesce(p_d50, false) then 1 else 0 end,
    case when coalesce(p_d75, false) then 1 else 0 end,
    case when coalesce(p_d100, false) then 1 else 0 end,
    case when p_action = 'share' then 1 else 0 end,
    case when p_action = 'listen' then 1 else 0 end,
    case when p_action = 'website' then 1 else 0 end,
    case when v_source = 'search' then 1 else 0 end,
    case when v_source = 'social' then 1 else 0 end,
    case when v_source = 'mail' then 1 else 0 end,
    case when v_source = 'ai' then 1 else 0 end,
    case when v_source = 'internal' then 1 else 0 end,
    case when v_source = 'direct' then 1 else 0 end,
    case when v_source = 'other' then 1 else 0 end
  )
  on conflict (article_id, day) do update
    set views = s.views + excluded.views,
        reads = s.reads + excluded.reads,
        seconds = s.seconds + excluded.seconds,
        d25 = s.d25 + excluded.d25,
        d50 = s.d50 + excluded.d50,
        d75 = s.d75 + excluded.d75,
        d100 = s.d100 + excluded.d100,
        shares = s.shares + excluded.shares,
        listens = s.listens + excluded.listens,
        website_clicks = s.website_clicks + excluded.website_clicks,
        src_search = s.src_search + excluded.src_search,
        src_social = s.src_social + excluded.src_social,
        src_mail = s.src_mail + excluded.src_mail,
        src_ai = s.src_ai + excluded.src_ai,
        src_internal = s.src_internal + excluded.src_internal,
        src_direct = s.src_direct + excluded.src_direct,
        src_other = s.src_other + excluded.src_other;
  return true;
end;
$$;

revoke all on function public.article_stats_record(uuid, boolean, boolean, integer, boolean, boolean, boolean, boolean, text, text) from public;
revoke all on function public.article_stats_record(uuid, boolean, boolean, integer, boolean, boolean, boolean, boolean, text, text) from anon;
revoke all on function public.article_stats_record(uuid, boolean, boolean, integer, boolean, boolean, boolean, boolean, text, text) from authenticated;
grant execute on function public.article_stats_record(uuid, boolean, boolean, integer, boolean, boolean, boolean, boolean, text, text) to service_role;
