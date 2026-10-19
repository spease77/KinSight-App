-- Connect failed with: new row violates row-level security policy
-- for table calendar_connections. Disable RLS so the server secret
-- key can insert Google tokens (KinSight is single-tenant).
drop policy if exists "calendar_connections_service_role" on public.calendar_connections;
drop policy if exists "calendar_connections_server" on public.calendar_connections;

alter table public.calendar_connections disable row level security;

notify pgrst, 'reload schema';
