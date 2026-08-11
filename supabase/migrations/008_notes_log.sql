-- Unified timestamped notes log per contact
alter table public.contacts
  add column if not exists notes_log jsonb not null default '[]'::jsonb;

create index if not exists contacts_notes_log_idx
  on public.contacts using gin (notes_log);

-- Refresh Supabase API schema cache so the app can read/write notes_log immediately
notify pgrst, 'reload schema';
