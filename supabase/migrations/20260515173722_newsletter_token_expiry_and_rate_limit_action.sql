-- Newsletter — Resend-Integration.
--
-- 1) Token-Expiry für Confirmation: Spalte `confirmation_expires_at` mit
--    Default `now() + 7 days` beim Insert. Postgres lehnt eine STORED
--    Generated Column auf `created_at + interval '7 days'` ab, weil das
--    `timestamptz + interval` als STABLE statt IMMUTABLE einstuft
--    (Timezone-Sensitivität bei Monats-/Jahres-Intervallen).
--    Stattdessen: normale Spalte mit Default-Expression. Default greift
--    beim Insert; `created_at` (auch `default now()`) und
--    `confirmation_expires_at` (default `now() + 7d`) sehen denselben
--    Transaktions-`now()`-Wert und differieren exakt um 7 Tage.
-- 2) Rate-Limit-Tabelle bekommt eine `action`-Spalte, damit subscribe- und
--    unsubscribe-Versuche separat gezählt werden können.

alter table public.newsletter_subscribers
  add column confirmation_expires_at timestamptz;

-- Backfill existierender Rows.
update public.newsletter_subscribers
  set confirmation_expires_at = created_at + interval '7 days'
  where confirmation_expires_at is null;

-- Default für neue Rows + NOT NULL nach dem Backfill.
alter table public.newsletter_subscribers
  alter column confirmation_expires_at set default now() + interval '7 days';
alter table public.newsletter_subscribers
  alter column confirmation_expires_at set not null;

-- Partial-Index: nur pending Rows, weil confirmed/unsubscribed irrelevant
-- für Expiry-Checks sind. Beschleunigt Lookups in der Confirmation-Route.
create index newsletter_subscribers_confirmation_expires_idx
  on public.newsletter_subscribers (confirmation_expires_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Rate-Limit-Tabelle: action-Spalte. Bestehende Rows haben Default
-- 'subscribe', damit keine alten Daten mit der neuen Trennung kollidieren.
-- ---------------------------------------------------------------------------

alter table public.newsletter_signup_attempts
  add column action text not null default 'subscribe'
  check (action in ('subscribe', 'unsubscribe'));

-- Neuer Composite-Index, der die action-Filter im Hot-Path mitnutzt.
-- Der bestehende (ip_hash, attempted_at)-Index bleibt für Backward-Compat,
-- könnte später entfernt werden.
create index newsletter_signup_attempts_action_ip_time_idx
  on public.newsletter_signup_attempts (action, ip_hash, attempted_at desc);
