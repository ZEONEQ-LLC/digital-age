-- Newsletter-Backend.
--
-- newsletter_subscribers hält Anmeldungen DSGVO-konform mit Consent-Beweis
-- (consent_at + consent_text). Confirmation-Token ist bereits bei jedem
-- Insert gesetzt, der Email-Versand wird aber in einem späteren PR mit
-- Resend aufgeschaltet — bis dahin bleiben alle Anmeldungen `pending`.
--
-- newsletter_signup_attempts dient ausschliesslich dem serverseitigen
-- Rate-Limiting (5/h, 20/24h pro IP-Hash). Wird opportunistisch beim
-- Anlegen neuer Attempts >24h alt gelöscht — kein Cron-Job nötig.

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  -- Generated Column: extrahiert lower(part nach @) automatisch.
  -- Postgres 12+, Supabase-supported.
  email_domain text generated always as (
    lower(split_part(email, '@', 2))
  ) stored,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirmation_token uuid default gen_random_uuid(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  source text not null
    check (source in ('footer', 'inline', 'full', 'sidebar')),
  -- Consent-Beweispflicht (DSGVO): wer hat WANN welchem WORTLAUT zugestimmt.
  consent_at timestamptz not null default now(),
  consent_text text not null,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index newsletter_subscribers_email_lower_idx
  on public.newsletter_subscribers (lower(email));
create index newsletter_subscribers_email_domain_idx
  on public.newsletter_subscribers (email_domain);
create index newsletter_subscribers_status_idx
  on public.newsletter_subscribers (status);
create index newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

-- updated_at automatisch pflegen
create or replace function public.set_updated_at_newsletter()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger newsletter_subscribers_set_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at_newsletter();

-- RLS: nur Editor liest und updated. Insert läuft ausschliesslich über
-- die Server Action mit Service-Role-Key (bypasst RLS) — keine
-- anon-INSERT-Policy, damit kein direkter Client-Insert möglich ist.
alter table public.newsletter_subscribers enable row level security;

create policy "newsletter_subscribers_select_editor"
  on public.newsletter_subscribers
  for select to authenticated
  using (public.is_editor());

create policy "newsletter_subscribers_update_editor"
  on public.newsletter_subscribers
  for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- KEIN DELETE: Unsubscribe setzt nur status='unsubscribed'.

-- ---------------------------------------------------------------------------
-- Rate-Limit-Tabelle: ein Eintrag pro Signup-Versuch, indiziert nach
-- (ip_hash, attempted_at). Wird in der Server Action regelmässig
-- aufgeräumt (Einträge >24h alt löschen).
-- ---------------------------------------------------------------------------

create table public.newsletter_signup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);

create index newsletter_signup_attempts_ip_time_idx
  on public.newsletter_signup_attempts (ip_hash, attempted_at desc);

-- RLS aktiv, aber KEINE Policies — nur Service-Role (Server Action) hat
-- Zugriff. Anon/Authenticated können nichts.
alter table public.newsletter_signup_attempts enable row level security;
