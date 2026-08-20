-- Allow contact deletion (matches read/insert/update policies in 002_fix_rls_policies.sql)
-- Run in Supabase SQL Editor if deletes appear to succeed but contacts remain in the list.

drop policy if exists "Allow public delete access" on public.contacts;
drop policy if exists "Enable delete for all" on public.contacts;

create policy "Enable delete for all"
  on public.contacts for delete
  to anon, authenticated, service_role
  using (true);
