-- Phase 7 Session C — Author Profile Fields
-- Ergänzt das authors-Schema um die Mock-Felder, die für die UI-Konsumenten
-- gebraucht werden (Author-Profil-Page, Article-Detail-AuthorBox).

alter table authors
  add column handle text,
  add column job_title text,
  add column location text,
  add column social_links jsonb,
  add column joined_at timestamptz not null default now();

create unique index idx_authors_handle on authors(handle) where handle is not null;
create index idx_authors_joined_at on authors(joined_at desc);

comment on column authors.handle is 'Public @handle, e.g. "alisoy" — without @ prefix. Wird im URL-Pfad /autor/<handle> verwendet';
comment on column authors.job_title is 'Anzeige-Job-Titel, z.B. "Founder & Editor in Chief" — separat vom role-Enum';
comment on column authors.social_links is 'JSONB: { linkedin?, x?, mastodon?, github?, website? }';
