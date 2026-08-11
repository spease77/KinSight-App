-- Voice note storage + per-field source attribution
-- Run in Supabase SQL Editor

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

alter table public.voice_recordings enable row level security;
alter table storage.objects enable row level security;

create policy "voice_recordings_select"
  on public.voice_recordings for select
  using (true);

create policy "voice_recordings_insert"
  on public.voice_recordings for insert
  with check (true);

create policy "voice_recordings_update"
  on public.voice_recordings for update
  using (true);

create policy "voice_notes_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'voice-notes');

create policy "voice_notes_storage_select"
  on storage.objects for select
  using (bucket_id = 'voice-notes');
