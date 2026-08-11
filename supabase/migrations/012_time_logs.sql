-- Time logs for Investment (Time Log) tracking
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

create policy "time_logs_select"
  on public.time_logs for select
  using (true);

create policy "time_logs_insert"
  on public.time_logs for insert
  with check (true);

create policy "time_logs_update"
  on public.time_logs for update
  using (true);

create policy "time_logs_delete"
  on public.time_logs for delete
  using (true);
