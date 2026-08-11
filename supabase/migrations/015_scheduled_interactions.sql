-- Scheduled interactions for Agenda (meetings & reminders)
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

create policy "scheduled_interactions_select"
  on public.scheduled_interactions for select
  using (true);

create policy "scheduled_interactions_insert"
  on public.scheduled_interactions for insert
  with check (true);

create policy "scheduled_interactions_update"
  on public.scheduled_interactions for update
  using (true);

create policy "scheduled_interactions_delete"
  on public.scheduled_interactions for delete
  using (true);

notify pgrst, 'reload schema';
