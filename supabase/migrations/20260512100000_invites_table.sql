-- Phase 7 PR B — Editor-Invite-Flow
--
-- Editors generieren Invite-Tokens (Editor-Admin-UI), User lösen sie via
-- /onboarding?token=... ein. handle_new_user (separate Migration) erkennt
-- Email-Match beim Magic-Link-Login, upgraded default 'external' auf
-- intended_role und markiert das Invite als accepted.

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text,
  intended_role author_role not null default 'author',
  token text unique not null default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by_id uuid references public.authors(id) on delete set null,
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_author_id uuid references public.authors(id) on delete set null,

  -- Invites sind nur für author/editor sinnvoll — external läuft über
  -- Self-Pitch-Flow (/artikel-pitchen), nicht über diese Tabelle.
  constraint invites_intended_role_not_external
    check (intended_role in ('author', 'editor'))
);

create index invites_token_idx on public.invites(token)
  where accepted_at is null and revoked_at is null;
create index invites_email_idx on public.invites(lower(email))
  where accepted_at is null and revoked_at is null;
create index invites_invited_by_idx on public.invites(invited_by_id);

alter table public.invites enable row level security;

-- =========================================================================
-- RLS: Editor-Full-Access. KEIN public-read — Onboarding-Lookup geht über
-- get_invite_by_token() RPC (SECURITY DEFINER unten).
-- =========================================================================

create policy "invites_editor_all"
  on public.invites for all
  to authenticated
  using (
    exists (
      select 1 from public.authors
      where user_id = auth.uid() and role = 'editor'
    )
  )
  with check (
    exists (
      select 1 from public.authors
      where user_id = auth.uid() and role = 'editor'
    )
  );

-- =========================================================================
-- RPC für Onboarding-Page: SECURITY DEFINER + EXECUTE-Grant für anon.
-- Frontend ruft supabase.rpc('get_invite_by_token', { p_token: '...' }) auf.
-- Returnt genau den einen Row oder NULL. Keine Table-Enumeration möglich,
-- da anon kein SELECT auf invites hat.
-- =========================================================================

create or replace function public.get_invite_by_token(p_token text)
returns table (
  id uuid,
  email text,
  display_name text,
  intended_role author_role,
  invited_by_id uuid,
  invited_by_name text,
  invited_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    i.id,
    i.email,
    i.display_name,
    i.intended_role,
    i.invited_by_id,
    a.display_name as invited_by_name,
    i.invited_at,
    i.expires_at,
    i.accepted_at,
    i.revoked_at
  from public.invites i
  left join public.authors a on a.id = i.invited_by_id
  where i.token = p_token
  limit 1;
$$;

revoke all on function public.get_invite_by_token(text) from public;
grant execute on function public.get_invite_by_token(text) to anon, authenticated;

-- =========================================================================
-- Grants (Supabase Data-API)
-- =========================================================================

grant select on public.invites to authenticated;
grant insert, update, delete on public.invites to authenticated;
