-- Extended contact profile (64 relationship intelligence fields)
-- Run in Supabase SQL Editor if not already applied

alter table public.contacts
  add column if not exists profile jsonb not null default '{}'::jsonb;

create index if not exists contacts_profile_idx on public.contacts using gin (profile);
