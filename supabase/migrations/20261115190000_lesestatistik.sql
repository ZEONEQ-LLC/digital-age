-- Lesestatistik fuer Autorinnen und Autoren. Additiv.
--
-- Gezaehlt wird im Tagesaggregat pro Beitrag (Zuercher Kalendertag), wie bei
-- den Anzeigen (ad_stats_daily): keine Rohereignisse, keine Kennung der
-- Leserin oder des Lesers, keine IP-Adresse. Geschrieben wird nur ueber die
-- RPC article_stats_record mit der Service-Role (Route /api/lektuere).
--
-- Gelesen wird ueber RLS: Die Redaktion sieht alles, Autorinnen und Autoren
-- sehen die Zeilen ihrer eigenen Beitraege.

create table public.article_stats_daily (
  article_id uuid not null references public.articles(id) on delete cascade,
  day date not null,
  -- Aufrufe: Der Beitrag wurde in einem Browser geoeffnet (ohne Bots, ohne
  -- angemeldete Redaktion und Autoren, ohne Neuladen).
  views integer not null default 0 check (views >= 0),
  -- Gelesen: bis zum Textende gescrollt und lange genug aktiv auf der Seite.
  reads integer not null default 0 check (reads >= 0),
  -- Aktive Lesezeit in Sekunden, Summe ueber alle Aufrufe.
  seconds bigint not null default 0 check (seconds >= 0),
  -- Lesetiefe: so viele Aufrufe haben 25, 50, 75, 100 Prozent des Textes erreicht.
  d25 integer not null default 0 check (d25 >= 0),
  d50 integer not null default 0 check (d50 >= 0),
  d75 integer not null default 0 check (d75 >= 0),
  d100 integer not null default 0 check (d100 >= 0),
  -- Aktionen: Klick auf «Teilen» (inkl. Link kopieren), «Anhören» gestartet.
  shares integer not null default 0 check (shares >= 0),
  listens integer not null default 0 check (listens >= 0),
  -- Herkunft der Aufrufe. Die Summe entspricht views.
  src_search integer not null default 0 check (src_search >= 0),
  src_social integer not null default 0 check (src_social >= 0),
  src_mail integer not null default 0 check (src_mail >= 0),
  src_ai integer not null default 0 check (src_ai >= 0),
  src_internal integer not null default 0 check (src_internal >= 0),
  src_direct integer not null default 0 check (src_direct >= 0),
  src_other integer not null default 0 check (src_other >= 0),
  primary key (article_id, day)
);

comment on table public.article_stats_daily is
  'Lesestatistik: Tagesaggregat pro Beitrag (Zuercher Kalendertag). Keine Rohereignisse, keine Personendaten. Schreiben nur ueber article_stats_record (service_role).';

create index idx_article_stats_daily_day on public.article_stats_daily(day);

alter table public.article_stats_daily enable row level security;

revoke all on table public.article_stats_daily from anon;
revoke insert, update, delete, truncate on table public.article_stats_daily from authenticated;

create policy "article_stats_daily_select_own_or_editor"
  on public.article_stats_daily
  for select
  to authenticated
  using (
    public.is_editor()
    or exists (
      select 1
        from public.articles a
       where a.id = article_stats_daily.article_id
         and a.author_id = public.current_author_id()
    )
  );

-- Zaehlen. Nur veroeffentlichte Beitraege, sonst false und keine Zeile.
-- p_seconds wird auf 0 bis 900 begrenzt (eine Meldung deckt hoechstens eine
-- Viertelstunde ab). Die Herkunft zaehlt nur zusammen mit einem Aufruf.
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
  if p_action is not null and p_action not in ('share', 'listen') then
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
    article_id, day, views, reads, seconds, d25, d50, d75, d100, shares, listens,
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

-- Lesen: Summen pro Beitrag im Zeitraum. security invoker, die RLS der
-- Tabelle entscheidet, welche Zeilen in die Summe kommen. Als RPC, weil eine
-- direkte Abfrage an der Zeilengrenze von PostgREST (1000) abgeschnitten wird.
create or replace function public.article_stats_summary(
  p_from date default null,
  p_to date default null
)
returns table (
  article_id uuid,
  views bigint,
  reads bigint,
  seconds bigint,
  d25 bigint,
  d50 bigint,
  d75 bigint,
  d100 bigint,
  shares bigint,
  listens bigint,
  src_search bigint,
  src_social bigint,
  src_mail bigint,
  src_ai bigint,
  src_internal bigint,
  src_direct bigint,
  src_other bigint,
  first_day date,
  last_day date
)
language sql
stable
security invoker
set search_path = public
as $$
  select s.article_id,
         sum(s.views)::bigint, sum(s.reads)::bigint, sum(s.seconds)::bigint,
         sum(s.d25)::bigint, sum(s.d50)::bigint, sum(s.d75)::bigint, sum(s.d100)::bigint,
         sum(s.shares)::bigint, sum(s.listens)::bigint,
         sum(s.src_search)::bigint, sum(s.src_social)::bigint, sum(s.src_mail)::bigint,
         sum(s.src_ai)::bigint, sum(s.src_internal)::bigint, sum(s.src_direct)::bigint,
         sum(s.src_other)::bigint,
         min(s.day), max(s.day)
    from public.article_stats_daily s
   where (p_from is null or s.day >= p_from)
     and (p_to is null or s.day <= p_to)
   group by s.article_id;
$$;

-- Lesen: Verlauf im Zeitraum, pro Tag, Woche (Montag) oder Monat. Optional
-- auf einen Beitrag oder auf die Beitraege einer Autorin, eines Autors
-- begrenzt (Filter der Redaktion).
create or replace function public.article_stats_series(
  p_from date default null,
  p_to date default null,
  p_article uuid default null,
  p_author uuid default null,
  p_bucket text default 'day'
)
returns table (
  bucket date,
  views bigint,
  reads bigint,
  seconds bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select date_trunc(case when p_bucket in ('week', 'month') then p_bucket else 'day' end, s.day::timestamp)::date as bucket,
         sum(s.views)::bigint, sum(s.reads)::bigint, sum(s.seconds)::bigint
    from public.article_stats_daily s
    join public.articles a on a.id = s.article_id
   where (p_from is null or s.day >= p_from)
     and (p_to is null or s.day <= p_to)
     and (p_article is null or s.article_id = p_article)
     and (p_author is null or a.author_id = p_author)
   group by 1
   order by 1;
$$;

revoke all on function public.article_stats_summary(date, date) from public;
revoke all on function public.article_stats_summary(date, date) from anon;
grant execute on function public.article_stats_summary(date, date) to authenticated, service_role;

revoke all on function public.article_stats_series(date, date, uuid, uuid, text) from public;
revoke all on function public.article_stats_series(date, date, uuid, uuid, text) from anon;
grant execute on function public.article_stats_series(date, date, uuid, uuid, text) to authenticated, service_role;

-- Rate-Limit-Aktion fuer die Zaehl-Route.
alter table public.newsletter_signup_attempts
  drop constraint newsletter_signup_attempts_action_check;
alter table public.newsletter_signup_attempts
  add constraint newsletter_signup_attempts_action_check
  check (action in ('subscribe', 'unsubscribe', 'contact', 'pitch', 'podcast_ingest', 'module_event', 'startup_contact', 'showcase_submit', 'showcase_upload', 'preview_response', 'article_read'));

-- Rueckbau:
-- drop function if exists public.article_stats_series(date, date, uuid, uuid, text);
-- drop function if exists public.article_stats_summary(date, date);
-- drop function if exists public.article_stats_record(uuid, boolean, boolean, integer, boolean, boolean, boolean, boolean, text, text);
-- drop table if exists public.article_stats_daily;
-- CHECK von newsletter_signup_attempts auf den Stand aus
-- 20261115160000_article_preview_links.sql zuruecksetzen.
