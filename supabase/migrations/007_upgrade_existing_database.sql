-- Safe upgrade for an EXISTING KinSight database (table already created).
-- Run this ENTIRE file as ONE query in Supabase SQL Editor.
-- Do NOT re-run create table / create policy for contacts.

-- 003: relationship profile
alter table public.contacts
  add column if not exists profile jsonb not null default '{}'::jsonb;

create index if not exists contacts_profile_idx
  on public.contacts using gin (profile);

-- 004: voice notes + source attribution
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-notes',
  'voice-notes',
  false,
  52428800,
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a']
)
on conflict (id) do nothing;

create table if not exists public.voice_recordings (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,
  storage_path text not null,
  mime_type text not null default 'audio/webm',
  duration_ms integer,
  transcript text not null default '',
  audio_url text,
  created_at timestamptz not null default now()
);

create index if not exists voice_recordings_contact_id_idx
  on public.voice_recordings (contact_id);

create index if not exists voice_recordings_created_at_idx
  on public.voice_recordings (created_at desc);

alter table public.contacts
  add column if not exists source_metadata jsonb not null default '{}'::jsonb;

create index if not exists contacts_source_metadata_idx
  on public.contacts using gin (source_metadata);

-- 006: resolved meeting date
alter table public.contacts
  add column if not exists last_meeting_date text;

create index if not exists contacts_last_meeting_date_idx
  on public.contacts (last_meeting_date);

-- RLS for voice_recordings (skip if policies already exist)
alter table public.voice_recordings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'voice_recordings' and policyname = 'voice_recordings_select'
  ) then
    create policy "voice_recordings_select"
      on public.voice_recordings for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'voice_recordings' and policyname = 'voice_recordings_insert'
  ) then
    create policy "voice_recordings_insert"
      on public.voice_recordings for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'voice_recordings' and policyname = 'voice_recordings_update'
  ) then
    create policy "voice_recordings_update"
      on public.voice_recordings for update
      using (true);
  end if;
end $$;

-- Storage policies (skip if already exist)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and policyname = 'voice_notes_storage_insert'
  ) then
    create policy "voice_notes_storage_insert"
      on storage.objects for insert
      with check (bucket_id = 'voice-notes');
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and policyname = 'voice_notes_storage_select'
  ) then
    create policy "voice_notes_storage_select"
      on storage.objects for select
      using (bucket_id = 'voice-notes');
  end if;
end $$;

-- 008: unified timestamped notes log
alter table public.contacts
  add column if not exists notes_log jsonb not null default '[]'::jsonb;

create index if not exists contacts_notes_log_idx
  on public.contacts using gin (notes_log);

-- Refresh Supabase API schema cache so the app can read/write notes_log immediately
notify pgrst, 'reload schema';

-- 009: contact relationship type
alter table public.contacts
  add column if not exists contact_type text
  check (contact_type is null or contact_type in ('professional', 'personal', 'family'));

alter table public.contacts
  add column if not exists contact_type_needs_confirmation boolean not null default false;

create index if not exists contacts_contact_type_idx
  on public.contacts (contact_type);

notify pgrst, 'reload schema';

-- 010: contact profile photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contact-photos',
  'contact-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

alter table public.contacts
  add column if not exists avatar_storage_path text;

alter table public.contacts
  add column if not exists avatar_url text;

alter table storage.objects enable row level security;

drop policy if exists "contact_photos_storage_insert" on storage.objects;
drop policy if exists "contact_photos_storage_select" on storage.objects;
drop policy if exists "contact_photos_storage_update" on storage.objects;

create policy "contact_photos_storage_insert"
  on storage.objects for insert
  to public
  with check (bucket_id = 'contact-photos');

create policy "contact_photos_storage_select"
  on storage.objects for select
  to public
  using (bucket_id = 'contact-photos');

create policy "contact_photos_storage_update"
  on storage.objects for update
  to public
  using (bucket_id = 'contact-photos')
  with check (bucket_id = 'contact-photos');

notify pgrst, 'reload schema';

-- 012: time logs for investment tracking
create table if not exists public.time_logs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  duration_minutes integer not null check (duration_minutes > 0),
  logged_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists time_logs_contact_id_idx
  on public.time_logs (contact_id);

create index if not exists time_logs_logged_at_idx
  on public.time_logs (logged_at desc);

alter table public.time_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'time_logs' and policyname = 'time_logs_select'
  ) then
    create policy "time_logs_select"
      on public.time_logs for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'time_logs' and policyname = 'time_logs_insert'
  ) then
    create policy "time_logs_insert"
      on public.time_logs for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'time_logs' and policyname = 'time_logs_update'
  ) then
    create policy "time_logs_update"
      on public.time_logs for update
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'time_logs' and policyname = 'time_logs_delete'
  ) then
    create policy "time_logs_delete"
      on public.time_logs for delete
      using (true);
  end if;
end $$;

-- 013: meeting format on time logs
alter table public.time_logs
  add column if not exists meeting_format text
  check (
    meeting_format is null
    or meeting_format in ('in_person', 'phone', 'video_call')
  );

notify pgrst, 'reload schema';

-- 014: allow subtract entries (negative duration_minutes)
alter table public.time_logs
  drop constraint if exists time_logs_duration_minutes_check;

alter table public.time_logs
  add constraint time_logs_duration_minutes_check
  check (duration_minutes <> 0);

notify pgrst, 'reload schema';

-- 015: scheduled interactions for Agenda
create table if not exists public.scheduled_interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  scheduled_at timestamptz not null,
  title text not null,
  behavioral_tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists scheduled_interactions_contact_id_idx
  on public.scheduled_interactions (contact_id);

create index if not exists scheduled_interactions_scheduled_at_idx
  on public.scheduled_interactions (scheduled_at asc);

alter table public.scheduled_interactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'scheduled_interactions' and policyname = 'scheduled_interactions_select'
  ) then
    create policy "scheduled_interactions_select"
      on public.scheduled_interactions for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'scheduled_interactions' and policyname = 'scheduled_interactions_insert'
  ) then
    create policy "scheduled_interactions_insert"
      on public.scheduled_interactions for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'scheduled_interactions' and policyname = 'scheduled_interactions_update'
  ) then
    create policy "scheduled_interactions_update"
      on public.scheduled_interactions for update
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'scheduled_interactions' and policyname = 'scheduled_interactions_delete'
  ) then
    create policy "scheduled_interactions_delete"
      on public.scheduled_interactions for delete
      using (true);
  end if;
end $$;

notify pgrst, 'reload schema';
