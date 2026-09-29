-- Werbung: UTM-Parameter beim Ausliefern (kein Builder).
--
--   a) ad_campaigns.utm_enabled  boolean not null default true
--      ad_campaigns.utm_campaign text null, Format ^[a-z0-9]+(-[a-z0-9]+)*$, max 80
--   b) Backfill: House-Kampagnen utm_enabled = false. utm_campaign bleibt bei
--      allen bestehenden Kampagnen NULL (Kennung setzt die Redaktion im Admin;
--      ohne Kennung wird nichts angehaengt).
--   c) Gate (BEFORE UPDATE): eine gesetzte Kennung ist ab live/paused/ended
--      eingefroren (GA4-Regel: nie waehrend der Laufzeit umbenennen). Solange
--      OLD.utm_campaign NULL ist oder OLD.status in (draft, offer, confirmed),
--      darf sie geaendert werden.
--
-- Rollback (Doku):
--   drop trigger if exists enforce_ad_campaign_utm_frozen on public.ad_campaigns;
--   drop function if exists public.check_ad_campaign_utm_frozen();
--   alter table public.ad_campaigns
--     drop column if exists utm_campaign,
--     drop column if exists utm_enabled;

-- =========================================================================
-- a) Spalten
-- =========================================================================
alter table public.ad_campaigns
  add column utm_enabled boolean not null default true,
  add column utm_campaign text null
    constraint ad_campaigns_utm_campaign_format
    check (utm_campaign ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(utm_campaign) <= 80);

-- =========================================================================
-- b) Backfill
-- =========================================================================
update public.ad_campaigns set utm_enabled = false where is_house;

-- =========================================================================
-- c) Kennung ab Laufzeit eingefroren (Muster: check_ad_campaign_house_immutable)
-- =========================================================================
create or replace function public.check_ad_campaign_utm_frozen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.utm_campaign is distinct from old.utm_campaign
     and old.utm_campaign is not null
     and old.status not in ('draft', 'offer', 'confirmed') then
    raise exception 'Kampagnen-Kennung ist waehrend der Laufzeit nicht aenderbar (Google Analytics).'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_ad_campaign_utm_frozen
  before update on public.ad_campaigns
  for each row execute function public.check_ad_campaign_utm_frozen();
