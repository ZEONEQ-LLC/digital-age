-- PR E — Mediadaten: Rail verkaufen, Kapazitaet fuer drei Partner.
--
--   a) rail_left / rail_right werden fuer Kundenkampagnen buchbar.
--   b) Alle Platzierungen: max. 3 Kunden gleichzeitig (Gruendungspartner-Paket,
--      "max. 3 Kunden im Wechsel" auf /mediadaten).
--   c) Die Ueberbuchungspruefung zaehlt Kunden (Kampagnen) statt Buchungen:
--      weitere Buchungen derselben Kampagne auf derselben Platzierung
--      (zweites Ressort, einzelne Artikel) belegen keinen zusaetzlichen Platz.
--      Vorher belegte z.B. eine Kampagne mit zwei Ressort-Buchungen zwei der
--      Plaetze. Beide Trigger-Funktionen sonst unveraendert.

-- =========================================================================
-- a) + b) Katalogwerte
-- =========================================================================
update public.ad_placements set is_sellable = true
 where code in ('rail_left', 'rail_right');

update public.ad_placements set max_concurrent = 3
 where code in ('home_billboard', 'hub_sidebar', 'swiss_ai_sidebar',
                'article_inline', 'rail_left', 'rail_right');

-- =========================================================================
-- c1) Buchungs-Trigger (Stand 20260921120000): distinct campaign_id, eigene
--     Kampagne ausgenommen.
-- =========================================================================
create or replace function public.check_ad_booking_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_house boolean;
  v_max smallint;
  v_count integer;
begin
  select is_house into v_is_house from public.ad_campaigns where id = new.campaign_id;
  if v_is_house then
    return new;   -- House-Buchungen nie pruefen
  end if;

  select max_concurrent into v_max from public.ad_placements where id = new.placement_id;

  -- Kapazitaet = Anzahl anderer Kunden-Kampagnen mit ueberlappender Buchung.
  select count(distinct b.campaign_id) into v_count
  from public.ad_bookings b
  join public.ad_campaigns c on c.id = b.campaign_id
  where b.placement_id = new.placement_id
    and b.id <> new.id
    and b.campaign_id <> new.campaign_id
    and b.period && new.period
    and c.is_house = false
    and c.status in ('confirmed','live');

  if v_count >= v_max then
    raise exception 'Ueberbuchung: Platzierung hat im gewaehlten Zeitraum keine freie Kapazitaet mehr (max %).', v_max
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- =========================================================================
-- c2) Aktivierungs-Trigger (Stand 20260924100000, INSERT-faehig): dieselbe
--     Zaehlung pro Kampagne.
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

      select count(distinct b.campaign_id) into v_count
      from public.ad_bookings b
      join public.ad_campaigns c on c.id = b.campaign_id
      where b.placement_id = r.placement_id
        and b.campaign_id <> new.id
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
-- Rollback (auskommentiert, nur als Doku):
-- update public.ad_placements set is_sellable = false where code in ('rail_left', 'rail_right');
-- update public.ad_placements set max_concurrent = 2 where code in ('home_billboard', 'hub_sidebar');
-- update public.ad_placements set max_concurrent = 1
--   where code in ('swiss_ai_sidebar', 'article_inline', 'rail_left', 'rail_right');
-- check_ad_booking_overlap:     Definition aus 20260921120000_module_placement_foundation.sql
--                               (count(*) ueber Buchungen, ohne campaign_id-Ausschluss)
-- check_ad_campaign_activation: Definition aus 20260924100000_ad_gates_hardening.sql
-- =========================================================================
