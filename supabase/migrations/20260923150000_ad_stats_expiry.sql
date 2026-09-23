-- PR B — Nach dem Livegang: Tagesaggregat fuer Auslieferungszahlen und
-- Ablaufwarnung. Additiv. Entscheide J1 (nur Tagesaggregat, keine Rohereignisse),
-- J3 (Schreiben nur ueber RPC mit Service-Role), J7 (einmal pro Buchung warnen).

-- =========================================================================
-- a) ad_stats_daily — ein Zaehler pro Kampagne x Kreativ x Platzierung x Tag
--    (Zuercher Kalendertag). Lesen nur Editor (Muster
--    newsletter_subscribers_select_editor); keine Insert/Update-Policy.
-- =========================================================================
create table public.ad_stats_daily (
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  creative_id uuid not null references public.ad_creatives(id) on delete cascade,
  placement_id uuid not null references public.ad_placements(id) on delete restrict,
  day date not null,
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  primary key (campaign_id, creative_id, placement_id, day)
);

create index idx_ad_stats_daily_campaign_day on public.ad_stats_daily(campaign_id, day);

alter table public.ad_stats_daily enable row level security;

create policy "ad_stats_daily_select_editor"
  on public.ad_stats_daily
  for select
  to authenticated
  using (public.is_editor());

-- =========================================================================
-- b) RPC module_stats_increment — Upsert-Zaehler. p_kind 'v' = sichtbare
--    Einblendung, 'c' = Klick. Nur service_role darf ausfuehren (Muster
--    20260707180000: revoke von public/anon/authenticated).
-- =========================================================================
create or replace function public.module_stats_increment(
  p_campaign uuid,
  p_creative uuid,
  p_placement uuid,
  p_kind text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('v', 'c') then
    raise exception 'module_stats_increment: kind muss v oder c sein' using errcode = 'invalid_parameter_value';
  end if;
  insert into public.ad_stats_daily (campaign_id, creative_id, placement_id, day, impressions, clicks)
  values (
    p_campaign, p_creative, p_placement,
    (now() at time zone 'Europe/Zurich')::date,
    case when p_kind = 'v' then 1 else 0 end,
    case when p_kind = 'c' then 1 else 0 end
  )
  on conflict (campaign_id, creative_id, placement_id, day) do update
    set impressions = public.ad_stats_daily.impressions + excluded.impressions,
        clicks = public.ad_stats_daily.clicks + excluded.clicks;
end;
$$;

revoke all on function public.module_stats_increment(uuid, uuid, uuid, text) from public;
revoke all on function public.module_stats_increment(uuid, uuid, uuid, text) from anon;
revoke all on function public.module_stats_increment(uuid, uuid, uuid, text) from authenticated;
grant execute on function public.module_stats_increment(uuid, uuid, uuid, text) to service_role;

-- =========================================================================
-- c) ad_bookings.expiry_notified_at — null = Ablaufwarnung noch nicht gesendet.
-- =========================================================================
alter table public.ad_bookings
  add column expiry_notified_at timestamptz;

comment on column public.ad_bookings.expiry_notified_at is
  'Zeitpunkt der Ablaufwarnung (7 Tage vor Buchungsende) an den Kunden. null = noch nicht gesendet. Einmal pro Buchung (J7).';

-- Rollback (auskommentiert, nur als Doku):
-- alter table public.ad_bookings drop column if exists expiry_notified_at;
-- drop function if exists public.module_stats_increment(uuid, uuid, uuid, text);
-- drop policy if exists "ad_stats_daily_select_editor" on public.ad_stats_daily;
-- drop index if exists public.idx_ad_stats_daily_campaign_day;
-- drop table if exists public.ad_stats_daily;
