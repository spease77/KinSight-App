-- Calendar sync metadata for scheduled interactions (future 2-way sync)
alter table public.scheduled_interactions
  add column if not exists source text not null default 'kinsight'
    check (source in ('kinsight', 'google', 'outlook')),
  add column if not exists external_event_id text,
  add column if not exists last_synced_at timestamptz;

create index if not exists scheduled_interactions_source_idx
  on public.scheduled_interactions (source);

create unique index if not exists scheduled_interactions_external_event_unique
  on public.scheduled_interactions (source, external_event_id)
  where external_event_id is not null;

notify pgrst, 'reload schema';
