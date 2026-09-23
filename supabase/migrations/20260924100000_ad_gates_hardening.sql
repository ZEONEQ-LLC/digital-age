-- PR C — Gates auch bei INSERT und nach Zustandsaenderung (Backlog H3/H4).
-- Additiv-restriktiv: keine Spalten, nur Trigger/Funktionen.
--
--   a) enforce_ad_campaign_activation / enforce_ad_campaign_ready feuern jetzt
--      BEFORE INSERT OR UPDATE; ein Direkt-Insert mit status confirmed/live
--      ist unmoeglich (neue Kampagnen starten als Entwurf).
--   b) Nachvalidierung, solange eine Kampagne confirmed/live/paused ist:
--      - ad_creatives: Aenderung an is_active/variant/placement_id oder Loeschen
--        darf keine gebuchte Platzierung ohne aktives Kreativ je Variante lassen.
--      - ad_advertisers: Adresse/Rechnungs-E-Mail nicht leeren, is_agency nicht
--        umstellen, solange der Kunde laufende Kampagnen hat.
--      Die Abdeckungslogik liegt in ad_campaign_coverage_gap() und wird von
--      check_ad_campaign_ready und dem Kreativ-Trigger gemeinsam genutzt.

-- =========================================================================
-- Hilfsfunktion: Abdeckungsluecke einer Kampagne. null = alles vorhanden,
-- sonst ein Fragment wie 'es fehlt ein aktives Desktop-Kreativ fuer <Label>.'
-- (Logik aus check_ad_campaign_ready, 20260923090000).
-- =========================================================================
create or replace function public.ad_campaign_coverage_gap(p_campaign uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_b record;
begin
  for v_b in
    select distinct p.id, p.label, p.mobile_size
    from public.ad_bookings b
    join public.ad_placements p on p.id = b.placement_id
    where b.campaign_id = p_campaign
  loop
    if not exists (
      select 1 from public.ad_creatives c
      where c.campaign_id = p_campaign and c.is_active and c.variant = 'desktop'
        and (c.placement_id is null or c.placement_id = v_b.id)
    ) then
      return format('es fehlt ein aktives Desktop-Kreativ fuer %s.', v_b.label);
    end if;
    if v_b.mobile_size is not null and not exists (
      select 1 from public.ad_creatives c
      where c.campaign_id = p_campaign and c.is_active and c.variant = 'mobile'
        and (c.placement_id is null or c.placement_id = v_b.id)
    ) then
      return format('es fehlt ein aktives Mobile-Kreativ fuer %s (liefert mobil aus).', v_b.label);
    end if;
  end loop;
  return null;
end;
$$;

-- =========================================================================
-- a1) check_ad_campaign_activation: INSERT-faehig (TG_OP), Rest unveraendert
--     (20260921120000). Bei INSERT gibt es noch keine Buchungen; der
--     Entwurfs-Zwang sitzt in check_ad_campaign_ready.
-- =========================================================================
create or replace function public.check_ad_campaign_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_max smallint;
  v_count integer;
  v_activating boolean;
begin
  if new.is_house then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    v_activating := new.status in ('confirmed','live');
  else
    v_activating := new.status in ('confirmed','live')
      and old.status is distinct from new.status
      and old.status not in ('confirmed','live');
  end if;

  if v_activating then
    for r in select * from public.ad_bookings where campaign_id = new.id loop
      select max_concurrent into v_max from public.ad_placements where id = r.placement_id;

      select count(*) into v_count
      from public.ad_bookings b
      join public.ad_campaigns c on c.id = b.campaign_id
      where b.placement_id = r.placement_id
        and b.id <> r.id
        and b.period && r.period
        and c.is_house = false
        and c.status in ('confirmed','live');

      if v_count >= v_max then
        raise exception 'Ueberbuchung: Aktivierung ueberschreitet die Kapazitaet einer belegten Platzierung im gewaehlten Zeitraum.'
          using errcode = 'check_violation';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

-- =========================================================================
-- a2) check_ad_campaign_ready: INSERT mit confirmed/live wird abgelehnt;
--     Kundenteil unveraendert (20260921130000); Abdeckung ueber die
--     Hilfsfunktion (20260923090000).
-- =========================================================================
create or replace function public.check_ad_campaign_ready()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adv record;
  v_gap text;
begin
  if TG_OP = 'INSERT' then
    if new.status in ('confirmed', 'live') then
      raise exception 'Kampagne kann nicht aktiviert werden: neue Kampagnen starten als Entwurf.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

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

    v_gap := public.ad_campaign_coverage_gap(new.id);
    if v_gap is not null then
      raise exception 'Kampagne kann nicht aktiviert werden: %', v_gap
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_ad_campaign_activation on public.ad_campaigns;
create trigger enforce_ad_campaign_activation
  before insert or update on public.ad_campaigns
  for each row execute function public.check_ad_campaign_activation();

drop trigger if exists enforce_ad_campaign_ready on public.ad_campaigns;
create trigger enforce_ad_campaign_ready
  before insert or update on public.ad_campaigns
  for each row execute function public.check_ad_campaign_ready();

-- =========================================================================
-- b1) ad_creatives: nach Aenderung/Loeschung muss die Abdeckung einer
--     laufenden Kampagne (confirmed/live/paused) erhalten bleiben.
--     AFTER statt BEFORE: die Abdeckungsabfrage muss den neuen Zustand
--     sehen; ein RAISE im AFTER-Trigger rollt die Aenderung zurueck.
-- =========================================================================
create or replace function public.check_ad_creative_still_needed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign uuid;
  v_status text;
begin
  v_campaign := case when TG_OP = 'DELETE' then old.campaign_id else new.campaign_id end;
  select status into v_status from public.ad_campaigns where id = v_campaign;
  if v_status in ('confirmed', 'live', 'paused')
     and public.ad_campaign_coverage_gap(v_campaign) is not null then
    raise exception 'Kreativ wird von einer laufenden Kampagne gebraucht. Zuerst Kampagne pausieren.'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create trigger enforce_ad_creative_still_needed_update
  after update of is_active, variant, placement_id on public.ad_creatives
  for each row execute function public.check_ad_creative_still_needed();

create trigger enforce_ad_creative_still_needed_delete
  after delete on public.ad_creatives
  for each row execute function public.check_ad_creative_still_needed();

-- =========================================================================
-- b2) ad_advertisers: dieselben Felder wie check_ad_campaign_ready
--     (Rechnungs-E-Mail, Adresse) plus is_agency, solange laufende
--     Kampagnen existieren.
-- =========================================================================
create or replace function public.check_ad_advertiser_in_use()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_running boolean;
  v_address_ok boolean;
begin
  v_address_ok :=
    (new.street is not null and new.house_number is not null
      and new.postal_code is not null and new.city is not null)
    or (new.post_office_box is not null and new.postal_code is not null and new.city is not null);

  if coalesce(new.billing_email, '') = '' or not v_address_ok
     or new.is_agency is distinct from old.is_agency then
    select exists (
      select 1 from public.ad_campaigns
      where advertiser_id = new.id and status in ('confirmed', 'live', 'paused')
    ) into v_running;
    if v_running then
      raise exception 'Kunde hat laufende Kampagnen. Adresse und Rechnungs-E-Mail koennen nicht geleert werden.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_ad_advertiser_in_use
  before update on public.ad_advertisers
  for each row execute function public.check_ad_advertiser_in_use();

-- =========================================================================
-- Rollback (auskommentiert, nur als Doku):
-- drop trigger if exists enforce_ad_advertiser_in_use on public.ad_advertisers;
-- drop function if exists public.check_ad_advertiser_in_use();
-- drop trigger if exists enforce_ad_creative_still_needed_delete on public.ad_creatives;
-- drop trigger if exists enforce_ad_creative_still_needed_update on public.ad_creatives;
-- drop function if exists public.check_ad_creative_still_needed();
-- drop trigger if exists enforce_ad_campaign_ready on public.ad_campaigns;
-- create trigger enforce_ad_campaign_ready before update on public.ad_campaigns
--   for each row execute function public.check_ad_campaign_ready();
-- drop trigger if exists enforce_ad_campaign_activation on public.ad_campaigns;
-- create trigger enforce_ad_campaign_activation before update on public.ad_campaigns
--   for each row execute function public.check_ad_campaign_activation();
-- check_ad_campaign_activation: Definition aus 20260921120000_module_placement_foundation.sql
-- check_ad_campaign_ready:      Definition aus 20260923090000_ad_images_preview.sql
-- drop function if exists public.ad_campaign_coverage_gap(uuid);
-- =========================================================================
