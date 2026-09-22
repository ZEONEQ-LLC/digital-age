-- Werbe-/Platzierungssystem — Runde 3 (additiv)
-- Baut auf 20260921120000 + 20260921130000 auf (beide remote angewandt; NICHT aendern).
--   a) is_house nach dem Anlegen unveraenderlich (E2)
--   b) is_sellable=false nur fuer House-Kampagnen buchbar (E6)
--   c) Varianten-Gate an Platzierung gekoppelt: Mobile-Kreativ nur, wenn eine
--      Buchung auf einer Platzierung mit mobile_size liegt (Desktop immer Pflicht)
--
-- Rollback (manuell):
--   drop trigger if exists enforce_ad_campaign_house_immutable on public.ad_campaigns;
--   drop function if exists public.check_ad_campaign_house_immutable();
--   drop trigger if exists enforce_ad_booking_sellable on public.ad_bookings;
--   drop function if exists public.check_ad_booking_sellable();
--   -- check_ad_campaign_ready zurueck auf den Stand aus 20260921130000:
--   create or replace function public.check_ad_campaign_ready()
--   returns trigger language plpgsql security definer set search_path = public as $$
--   declare v_adv record; v_has_booking boolean; v_desktop integer; v_mobile integer;
--   begin
--     if new.status in ('confirmed','live') and old.status is distinct from new.status
--        and old.status not in ('confirmed','live') then
--       if new.is_house = false then
--         select * into v_adv from public.ad_advertisers where id = new.advertiser_id;
--         if v_adv.id is null then raise exception 'Kampagne kann nicht aktiviert werden: kein Kunde zugewiesen.' using errcode = 'check_violation'; end if;
--         if coalesce(v_adv.billing_email,'') = '' then raise exception 'Kampagne kann nicht aktiviert werden: dem Kunden fehlt eine Rechnungs-E-Mail.' using errcode = 'check_violation'; end if;
--         if not ((v_adv.street is not null and v_adv.house_number is not null and v_adv.postal_code is not null and v_adv.city is not null)
--              or (v_adv.post_office_box is not null and v_adv.postal_code is not null and v_adv.city is not null)) then
--           raise exception 'Kampagne kann nicht aktiviert werden: dem Kunden fehlt eine vollstaendige Rechnungsadresse.' using errcode = 'check_violation';
--         end if;
--       end if;
--       select exists(select 1 from public.ad_bookings where campaign_id = new.id) into v_has_booking;
--       if v_has_booking then
--         select count(*) into v_desktop from public.ad_creatives where campaign_id = new.id and is_active and variant = 'desktop';
--         select count(*) into v_mobile  from public.ad_creatives where campaign_id = new.id and is_active and variant = 'mobile';
--         if v_desktop = 0 or v_mobile = 0 then
--           raise exception 'Kampagne kann nicht aktiviert werden: es fehlt ein aktives Kreativ fuer Desktop und/oder Mobile.' using errcode = 'check_violation';
--         end if;
--       end if;
--     end if;
--     return new;
--   end; $$;

-- =========================================================================
-- a) is_house unveraenderlich (E2)
-- =========================================================================
create or replace function public.check_ad_campaign_house_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_house is distinct from old.is_house then
    raise exception 'Kampagnenart (House/Kunde) kann nach dem Anlegen nicht geaendert werden.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_ad_campaign_house_immutable
  before update on public.ad_campaigns
  for each row execute function public.check_ad_campaign_house_immutable();

-- =========================================================================
-- b) is_sellable durchsetzen (E6)
-- =========================================================================
create or replace function public.check_ad_booking_sellable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_house boolean;
  v_sellable boolean;
begin
  select is_house into v_is_house from public.ad_campaigns where id = new.campaign_id;
  select is_sellable into v_sellable from public.ad_placements where id = new.placement_id;
  if coalesce(v_is_house, false) = false and coalesce(v_sellable, true) = false then
    raise exception 'Diese Platzierung ist nur fuer House-Kampagnen buchbar.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_ad_booking_sellable
  before insert or update on public.ad_bookings
  for each row execute function public.check_ad_booking_sellable();

-- =========================================================================
-- c) Varianten-Gate an Platzierung koppeln
-- Desktop bleibt immer Pflicht. Mobile nur, wenn mindestens eine Buchung der
-- Kampagne auf einer Platzierung mit mobile_size is not null liegt.
-- Alles andere unveraendert gegenueber 20260921130000.
-- =========================================================================
create or replace function public.check_ad_campaign_ready()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adv record;
  v_has_booking boolean;
  v_needs_mobile boolean;
  v_desktop integer;
  v_mobile integer;
begin
  if new.status in ('confirmed', 'live')
     and old.status is distinct from new.status
     and old.status not in ('confirmed', 'live') then

    -- Nicht-House: Kunde muss abrechenbar sein.
    if new.is_house = false then
      select * into v_adv from public.ad_advertisers where id = new.advertiser_id;
      if v_adv.id is null then
        raise exception 'Kampagne kann nicht aktiviert werden: kein Kunde zugewiesen.'
          using errcode = 'check_violation';
      end if;
      if coalesce(v_adv.billing_email, '') = '' then
        raise exception 'Kampagne kann nicht aktiviert werden: dem Kunden fehlt eine Rechnungs-E-Mail.'
          using errcode = 'check_violation';
      end if;
      if not (
        (v_adv.street is not null and v_adv.house_number is not null
          and v_adv.postal_code is not null and v_adv.city is not null)
        or (v_adv.post_office_box is not null and v_adv.postal_code is not null and v_adv.city is not null)
      ) then
        raise exception 'Kampagne kann nicht aktiviert werden: dem Kunden fehlt eine vollstaendige Rechnungsadresse.'
          using errcode = 'check_violation';
      end if;
    end if;

    -- Kreativ-Abdeckung: nur relevant, wenn ueberhaupt Buchungen existieren.
    select exists(select 1 from public.ad_bookings where campaign_id = new.id) into v_has_booking;
    if v_has_booking then
      select count(*) into v_desktop from public.ad_creatives
        where campaign_id = new.id and is_active and variant = 'desktop';
      if v_desktop = 0 then
        raise exception 'Kampagne kann nicht aktiviert werden: es fehlt ein aktives Kreativ fuer Desktop.'
          using errcode = 'check_violation';
      end if;

      select exists(
        select 1 from public.ad_bookings b
        join public.ad_placements p on p.id = b.placement_id
        where b.campaign_id = new.id and p.mobile_size is not null
      ) into v_needs_mobile;
      if v_needs_mobile then
        select count(*) into v_mobile from public.ad_creatives
          where campaign_id = new.id and is_active and variant = 'mobile';
        if v_mobile = 0 then
          raise exception 'Kampagne kann nicht aktiviert werden: es fehlt ein aktives Kreativ fuer Mobile (eine gebuchte Platzierung liefert mobil aus).'
            using errcode = 'check_violation';
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;
