-- Contact-first identity so voice notes and calendar events attach to profiles.
-- `contacts.name` remains the full name (do not rename; the app writes `name`).
-- Canonical `email` is a lookup column; labeled emails still live on profile.
-- Creates `calendar_events` if migration 021 was never run on this database.

create extension if not exists pg_trgm;

alter table public.contacts
  add column if not exists aliases text[] not null default '{}'::text[],
  add column if not exists email text;

create unique index if not exists contacts_email_unique
  on public.contacts (lower(email))
  where email is not null and length(trim(email)) > 0;

create index if not exists contacts_name_trgm_idx
  on public.contacts using gin (name gin_trgm_ops);

create index if not exists contacts_aliases_gin_idx
  on public.contacts using gin (aliases);

with candidates as (
  select
    id,
    created_at,
    lower(trim(coalesce(
      nullif(profile->>'businessEmail', ''),
      nullif(profile->>'personalEmail', ''),
      nullif(profile->>'otherEmail', '')
    ))) as email_candidate
  from public.contacts
  where email is null
), ranked as (
  select
    id,
    email_candidate,
    row_number() over (
      partition by email_candidate
      order by created_at
    ) as rn
  from candidates
  where email_candidate is not null
    and position('@' in email_candidate) > 1
)
update public.contacts as c
set email = ranked.email_candidate
from ranked
where c.id = ranked.id
  and ranked.rn = 1;

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
  contact_id uuid references public.contacts(id) on delete set null,
  title text,
  start_time timestamptz,
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

create policy "calendar_events_server"
  on public.calendar_events for all
  using (true)
  with check (true);

alter table public.calendar_events
  add column if not exists contact_id uuid references public.contacts(id)
    on delete set null,
  add column if not exists title text,
  add column if not exists start_time timestamptz;

create index if not exists calendar_events_contact_id_idx
  on public.calendar_events (contact_id)
  where contact_id is not null;

create index if not exists calendar_events_start_time_idx
  on public.calendar_events (start_time)
  where start_time is not null;

create table if not exists public.voice_logs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  calendar_event_id uuid references public.calendar_events(id)
    on delete set null,
  transcript text not null default '',
  ai_summary text,
  action_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists voice_logs_contact_id_idx
  on public.voice_logs (contact_id, created_at desc);

create index if not exists voice_logs_calendar_event_id_idx
  on public.voice_logs (calendar_event_id)
  where calendar_event_id is not null;

alter table public.voice_logs enable row level security;

drop policy if exists "voice_logs_server" on public.voice_logs;

create policy "voice_logs_server"
  on public.voice_logs for all
  using (true)
  with check (true);

notify pgrst, 'reload schema';
