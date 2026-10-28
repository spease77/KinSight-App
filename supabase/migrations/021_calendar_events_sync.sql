-- Bidirectional Google / Outlook calendar editing.
-- `scheduled_interactions.source` is the provider ('kinsight' | 'google' | 'outlook').
-- `calendar_events` stores the per-provider copy (external id, calendar, sync state)
-- so events without a KinSight contact can still be edited and re-synced.

alter table public.scheduled_interactions
  add column if not exists calendar_id text,
  add column if not exists is_organizer boolean not null default true,
  add column if not exists is_read_only boolean not null default false,
  add column if not exists sync_status text not null default 'synced';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scheduled_interactions_sync_status_check'
  ) then
    alter table public.scheduled_interactions
      add constraint scheduled_interactions_sync_status_check
      check (sync_status in ('synced', 'pending', 'error'));
  end if;
end $$;

create index if not exists scheduled_interactions_sync_status_idx
  on public.scheduled_interactions (sync_status);

create index if not exists scheduled_interactions_calendar_id_idx
  on public.scheduled_interactions (calendar_id)
  where calendar_id is not null;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scheduled_interaction_id uuid references public.scheduled_interactions(id)
    on delete set null,
  provider text not null check (provider in ('google', 'outlook', 'kinsight')),
  external_event_id text,
  calendar_id text,
  is_organizer boolean not null default true,
  is_read_only boolean not null default false,
  sync_status text not null default 'pending'
    check (sync_status in ('synced', 'pending', 'error')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists calendar_events_provider_external_unique
  on public.calendar_events (user_id, provider, external_event_id)
  where external_event_id is not null;

create unique index if not exists calendar_events_interaction_provider_unique
  on public.calendar_events (scheduled_interaction_id, provider)
  where scheduled_interaction_id is not null;

create index if not exists calendar_events_user_id_idx
  on public.calendar_events (user_id);

create index if not exists calendar_events_sync_status_idx
  on public.calendar_events (sync_status);

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_server" on public.calendar_events;

-- Server routes use the secret key. Match other KinSight tables.
create policy "calendar_events_server"
  on public.calendar_events for all
  using (true)
  with check (true);

notify pgrst, 'reload schema';
