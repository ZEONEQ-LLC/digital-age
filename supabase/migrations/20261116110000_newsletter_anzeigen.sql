-- Anzeigen im Newsletter (Wunsch Ali 16.11.2026): Laufende Kampagnen der
-- Werbepartner koennen im woechentlichen Newsletter stehen, gekennzeichnet
-- als «Anzeige».
--
--   * ad_campaigns.in_newsletter: Die Kampagne wird fuer neue Ausgaben
--     vorgeschlagen. Ob sie in einer Ausgabe steht, entscheidet die Redaktion
--     im Entwurf (newsletter_issues.sections -> ads).
--   * newsletter_ad_clicks: Klicks pro Ausgabe und Kampagne. Nur Summen, keine
--     Kennung der Empfaenger:innen. Die Zahl der Zustellungen steht schon in
--     newsletter_issues.delivered_count.
--   * newsletter_ad_click(): zaehlt einen Klick, aber nur fuer Ausgaben, die
--     versendet sind und die Kampagne wirklich enthalten. Nur service_role
--     (Aufruf aus der Weiterleitung /api/module/weiter).
--
-- Die Zahlen der Website (ad_stats_daily: sichtbare Einblendungen und Klicks)
-- bleiben davon getrennt: Eine zugestellte Mail ist keine Einblendung.
--
-- Additiv: eine Spalte mit Default, eine Tabelle, eine Funktion.

alter table public.ad_campaigns
  add column if not exists in_newsletter boolean not null default false;

comment on column public.ad_campaigns.in_newsletter is
  'Kampagne fuer den Newsletter vorschlagen (Kennzeichnung «Anzeige»). Ob sie in einer Ausgabe steht, entscheidet die Redaktion im Entwurf.';

create table if not exists public.newsletter_ad_clicks (
  issue_id uuid not null references public.newsletter_issues(id) on delete cascade,
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  clicks integer not null default 0 check (clicks >= 0),
  first_click_at timestamptz not null default now(),
  last_click_at timestamptz not null default now(),
  primary key (issue_id, campaign_id)
);

comment on table public.newsletter_ad_clicks is
  'Klicks auf Anzeigen im Newsletter, Summe pro Ausgabe und Kampagne. Geschrieben nur ueber newsletter_ad_click() (service_role), gelesen von Editor:innen.';

create index if not exists newsletter_ad_clicks_campaign_idx
  on public.newsletter_ad_clicks (campaign_id);

alter table public.newsletter_ad_clicks enable row level security;

drop policy if exists "newsletter_ad_clicks_select_editor" on public.newsletter_ad_clicks;
create policy "newsletter_ad_clicks_select_editor" on public.newsletter_ad_clicks
  for select to authenticated using (is_editor());

revoke all on table public.newsletter_ad_clicks from anon;
revoke insert, update, delete, truncate on table public.newsletter_ad_clicks from authenticated;

create or replace function public.newsletter_ad_click(p_issue uuid, p_campaign uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not exists (
    select 1
      from public.newsletter_issues i
     where i.id = p_issue
       and i.status in ('sending', 'sent')
       and exists (
         select 1
           from jsonb_array_elements(
                  case when jsonb_typeof(i.sections -> 'ads') = 'array' then i.sections -> 'ads' else '[]'::jsonb end
                ) as a
          where a ->> 'campaignId' = p_campaign::text
       )
  ) then
    return false;
  end if;

  insert into public.newsletter_ad_clicks (issue_id, campaign_id, clicks)
  values (p_issue, p_campaign, 1)
  on conflict (issue_id, campaign_id) do update
    set clicks = public.newsletter_ad_clicks.clicks + 1,
        last_click_at = now();
  return true;
end;
$fn$;

revoke all on function public.newsletter_ad_click(uuid, uuid) from public;
revoke all on function public.newsletter_ad_click(uuid, uuid) from anon;
revoke all on function public.newsletter_ad_click(uuid, uuid) from authenticated;
grant execute on function public.newsletter_ad_click(uuid, uuid) to service_role;
