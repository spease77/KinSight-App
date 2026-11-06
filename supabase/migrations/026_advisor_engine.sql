-- People Advisor Engine: contact intelligence + pre-meeting cards + follow-up tasks

alter table public.contacts
  add column if not exists intelligence_profile jsonb;

alter table public.calendar_events
  add column if not exists pre_meeting_card jsonb;

create table if not exists public.advisor_tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  calendar_event_id uuid references public.calendar_events(id) on delete set null,
  voice_log_id uuid references public.voice_logs(id) on delete set null,
  title text not null,
  due_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'done', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists advisor_tasks_contact_id_idx
  on public.advisor_tasks (contact_id, created_at desc);

create index if not exists advisor_tasks_status_idx
  on public.advisor_tasks (status)
  where status = 'pending';

alter table public.advisor_tasks enable row level security;

drop policy if exists "advisor_tasks_server" on public.advisor_tasks;

create policy "advisor_tasks_server"
  on public.advisor_tasks for all
  using (true)
  with check (true);

notify pgrst, 'reload schema';
