-- Close the Supabase security linter findings:
--   rls_disabled_in_public   — 020 turned RLS off on calendar_connections
--   sensitive_columns_exposed — access_token / refresh_token were readable
--     via the anon (publishable) API key
--
-- KinSight server routes already use SUPABASE_SECRET_KEY, which bypasses RLS.
-- Anon / authenticated clients must not read or write OAuth tokens.

-- 1) calendar_connections: tokens. Never expose through PostgREST.
alter table if exists public.calendar_connections enable row level security;
alter table if exists public.calendar_connections force row level security;

drop policy if exists "calendar_connections_server" on public.calendar_connections;
drop policy if exists "calendar_connections_select" on public.calendar_connections;
drop policy if exists "calendar_connections_insert" on public.calendar_connections;
drop policy if exists "calendar_connections_update" on public.calendar_connections;
drop policy if exists "calendar_connections_delete" on public.calendar_connections;
drop policy if exists "calendar_connections_service_role" on public.calendar_connections;

-- No policy for anon / authenticated → default deny on the Data API.
create policy "calendar_connections_service_role"
  on public.calendar_connections
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.calendar_connections from public;
revoke all on table public.calendar_connections from anon;
revoke all on table public.calendar_connections from authenticated;
grant all on table public.calendar_connections to postgres;
grant all on table public.calendar_connections to service_role;

-- 2) calendar_events: same pattern (021 shipped an open using(true) policy).
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'calendar_events'
  ) then
    execute 'alter table public.calendar_events enable row level security';
    execute 'alter table public.calendar_events force row level security';
    execute 'drop policy if exists "calendar_events_server" on public.calendar_events';
    execute $p$
      create policy "calendar_events_service_role"
        on public.calendar_events
        for all
        to service_role
        using (true)
        with check (true)
    $p$;
    execute 'revoke all on table public.calendar_events from public';
    execute 'revoke all on table public.calendar_events from anon';
    execute 'revoke all on table public.calendar_events from authenticated';
    execute 'grant all on table public.calendar_events to postgres';
    execute 'grant all on table public.calendar_events to service_role';
  end if;
end $$;

-- 3) Catch-all: turn RLS on for any other public table still missing it.
--    Existing open policies (contacts, etc.) are unchanged — this only
--    fixes tables that currently have RLS disabled.
do $$
declare
  r record;
begin
  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  loop
    execute format(
      'alter table public.%I enable row level security',
      r.table_name
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
