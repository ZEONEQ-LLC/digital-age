-- Werbe-/Platzierungssystem — Constraints + Aktivierungs-Gates (additiv)
-- Baut auf 20260921120000 auf (bereits angewandt; NICHT mehr aendern).
--
-- Rollback (manuell):
--   drop trigger if exists enforce_ad_campaign_ready on public.ad_campaigns;
--   drop function if exists public.check_ad_campaign_ready();
--   drop trigger if exists enforce_ad_advertiser_billing_agency on public.ad_advertisers;
--   drop function if exists public.check_ad_advertiser_billing_agency();
--   alter table public.ad_advertisers
--     drop constraint if exists ad_advertisers_language_chk,
--     drop constraint if exists ad_advertisers_address_complete;
--   alter table public.ad_advertisers alter column language drop not null,
--     alter column language drop default;

-- =========================================================================
-- 2a) language: not null default 'de', CHECK in (de/fr/it/en)
-- =========================================================================
update public.ad_advertisers set language = 'de' where language is null;
alter table public.ad_advertisers alter column language set default 'de';
alter table public.ad_advertisers alter column language set not null;
alter table public.ad_advertisers
  add constraint ad_advertisers_language_chk check (language in ('de', 'fr', 'it', 'en'));

-- =========================================================================
-- 2b) Adress-Vollstaendigkeit: sobald IRGENDEIN Adressfeld befuellt ist,
-- muss entweder (Strasse + Hausnr + PLZ + Ort) ODER (Postfach + PLZ + Ort)
-- vorhanden sein. Vollstaendig leere Adresse bleibt erlaubt. (country hat
-- immer Default 'CH' und zaehlt hier nicht als "befuellt".)
-- =========================================================================
alter table public.ad_advertisers
  add constraint ad_advertisers_address_complete check (
    (address_addition is null and street is null and house_number is null
      and post_office_box is null and postal_code is null and city is null)
    or (street is not null and house_number is not null
      and postal_code is not null and city is not null)
    or (post_office_box is not null and postal_code is not null and city is not null)
  );

-- =========================================================================
-- 2c) Aktivierungs-Gate ad_campaigns (Statuswechsel -> confirmed/live).
-- Zusaetzlich zum bestehenden Ueberbuchungs-/Aktivierungs-Trigger.
--   - Nicht-House: Advertiser mit vollstaendiger Adresse + Rechnungs-E-Mail.
--   - Sobald die Kampagne min. eine Buchung hat: je Variante (desktop UND
--     mobile) min. ein aktives Kreativ.
-- Muster wie check_ad_booking_overlap (security definer, check_violation).
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
      select count(*) into v_mobile from public.ad_creatives
        where campaign_id = new.id and is_active and variant = 'mobile';
      if v_desktop = 0 or v_mobile = 0 then
        raise exception 'Kampagne kann nicht aktiviert werden: es fehlt ein aktives Kreativ fuer Desktop und/oder Mobile.'
          using errcode = 'check_violation';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_ad_campaign_ready
  before update on public.ad_campaigns
  for each row execute function public.check_ad_campaign_ready();

-- =========================================================================
-- 2d) billing_via_agency_id: Ziel muss Agentur sein; kein Selbstbezug;
-- kein Zwei-Stufen-Zyklus (A -> B -> A). CHECK kann keine anderen Rows
-- lesen -> Trigger.
-- =========================================================================
create or replace function public.check_ad_advertiser_billing_agency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target record;
begin
  if new.billing_via_agency_id is not null then
    if new.billing_via_agency_id = new.id then
      raise exception 'Rechnung ueber Agentur: Kunde darf nicht auf sich selbst zeigen.'
        using errcode = 'check_violation';
    end if;
    select id, is_agency, billing_via_agency_id into v_target
      from public.ad_advertisers where id = new.billing_via_agency_id;
    if v_target.id is null then
      raise exception 'Rechnung ueber Agentur: Ziel-Kunde existiert nicht.'
        using errcode = 'check_violation';
    end if;
    if v_target.is_agency = false then
      raise exception 'Rechnung ueber Agentur: Ziel muss eine Agentur sein (is_agency = true).'
        using errcode = 'check_violation';
    end if;
    if v_target.billing_via_agency_id = new.id then
      raise exception 'Rechnung ueber Agentur: Zyklus erkannt (A -> B -> A).'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_ad_advertiser_billing_agency
  before insert or update on public.ad_advertisers
  for each row execute function public.check_ad_advertiser_billing_agency();
