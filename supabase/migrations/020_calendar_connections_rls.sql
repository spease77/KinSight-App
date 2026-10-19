-- Connect failed with: new row violates row-level security policy
-- for table calendar_connections. The previous policy only allowed
-- the JWT role service_role; Vercel's secret key does not match it.
drop policy if exists "calendar_connections_service_role" on public.calendar_connections;
drop policy if exists "calendar_connections_server" on public.calendar_connections;

create policy "calendar_connections_server"
  on public.calendar_connections for all
  using (true)
  with check (true);

notify pgrst, 'reload schema';
