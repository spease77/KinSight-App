-- Stable Google/Outlook identity so a later install or device can
-- reattach the same mailbox without creating an orphaned token row.
alter table if exists public.calendar_connections
  add column if not exists provider_account_id text;

create index if not exists calendar_connections_provider_account_idx
  on public.calendar_connections (provider, provider_account_id)
  where provider_account_id is not null;

notify pgrst, 'reload schema';
