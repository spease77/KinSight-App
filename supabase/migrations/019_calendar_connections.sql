-- Per-user OAuth tokens for personal calendar providers.
-- user_id is the KinSight auth user when present, otherwise a stable id
-- derived from the Google account that connected in Settings.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'calendar_connections'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'calendar_connections'
      and column_name = 'user_id'
  ) then
    drop table public.calendar_connections;
  end if;
end $$;

create table if not exists public.calendar_connections (
  user_id uuid not null,
  provider text not null check (provider in ('google', 'outlook')),
  account_email text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'calendar_connections'
      and constraint_type = 'FOREIGN KEY'
      and constraint_name = 'calendar_connections_user_id_fkey'
  ) then
    alter table public.calendar_connections
      drop constraint calendar_connections_user_id_fkey;
  end if;
end $$;

create index if not exists calendar_connections_user_id_idx
  on public.calendar_connections (user_id);

alter table public.calendar_connections enable row level security;

drop policy if exists "calendar_connections_select" on public.calendar_connections;
drop policy if exists "calendar_connections_insert" on public.calendar_connections;
drop policy if exists "calendar_connections_update" on public.calendar_connections;
drop policy if exists "calendar_connections_delete" on public.calendar_connections;
drop policy if exists "calendar_connections_service_role" on public.calendar_connections;

-- Tokens stay server-side (service role). Browser clients cannot read them.
create policy "calendar_connections_service_role"
  on public.calendar_connections for all
  to service_role
  using (true)
  with check (true);

notify pgrst, 'reload schema';
