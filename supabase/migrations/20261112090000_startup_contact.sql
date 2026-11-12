-- Startup «Get in touch» (PR 194). Additiv.
--
-- Entscheid Ali (11.11.2026): Anfragen gehen direkt ans Startup, aber nur mit
-- ausdrücklichem Einverständnis des Startups zur Weiterleitung. Die Redaktion
-- sieht, dass es Anfragen gab (wann, welches Startup, welcher Zweck), nicht
-- den Inhalt. Darum:
--   * startup_contacts: Kontaktadresse + Einverständnis je Startup. Nur
--     Editoren (RLS) und Service-Role; die Adresse ist nie öffentlich lesbar.
--     Zeile existiert nur mit Einverständnis; beendet = revoked_at gesetzt.
--   * startup_contact_requests: nur Metadaten der Anfragen, KEIN Name, keine
--     E-Mail, keine Nachricht. Der Inhalt geht ausschliesslich per Mail ans
--     Startup (Reply-To = Absender).
--   * Rate-Limit-Aktion 'startup_contact' für newsletter_signup_attempts.

create table public.startup_contacts (
  startup_id uuid primary key references public.ai_startups(id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 255),
  -- Einverständnis zur Weiterleitung: wann und woher (Einreichformular oder
  -- von der Redaktion eingetragen, z.B. nach schriftlicher Zusage).
  consent_at timestamptz not null default now(),
  consent_source text not null check (consent_source in ('submission', 'editor')),
  consent_note text check (consent_note is null or length(consent_note) <= 300),
  -- Link «Weiterleitung beenden» in jeder weitergeleiteten Mail.
  optout_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger startup_contacts_set_updated_at
  before update on public.startup_contacts
  for each row execute function public.set_updated_at();

alter table public.startup_contacts enable row level security;

create policy "startup_contacts_editor_all" on public.startup_contacts
  for all to authenticated using (is_editor()) with check (is_editor());

create table public.startup_contact_requests (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.ai_startups(id) on delete cascade,
  purpose text not null check (purpose in ('investment', 'customer', 'partnership', 'press', 'other')),
  delivered boolean not null default false,
  created_at timestamptz not null default now()
);

create index startup_contact_requests_startup_idx
  on public.startup_contact_requests (startup_id, created_at desc);

alter table public.startup_contact_requests enable row level security;

create policy "startup_contact_requests_editor_select" on public.startup_contact_requests
  for select to authenticated using (is_editor());

-- Rate-Limit: neue Aktion (Muster 20261109150000_module_event_rate_limit.sql).
alter table public.newsletter_signup_attempts
  drop constraint newsletter_signup_attempts_action_check;
alter table public.newsletter_signup_attempts
  add constraint newsletter_signup_attempts_action_check
  check (action in ('subscribe', 'unsubscribe', 'contact', 'pitch', 'podcast_ingest', 'module_event', 'startup_contact'));
