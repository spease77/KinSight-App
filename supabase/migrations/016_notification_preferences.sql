-- User notification preferences (singleton row for single-tenant KinSight)
create table if not exists public.user_settings (
  id text primary key default 'default',
  global_notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.user_settings (id, global_notifications_enabled)
values ('default', true)
on conflict (id) do nothing;

alter table public.user_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_settings' and policyname = 'user_settings_select'
  ) then
    create policy "user_settings_select"
      on public.user_settings for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'user_settings' and policyname = 'user_settings_update'
  ) then
    create policy "user_settings_update"
      on public.user_settings for update
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'user_settings' and policyname = 'user_settings_insert'
  ) then
    create policy "user_settings_insert"
      on public.user_settings for insert
      with check (true);
  end if;
end $$;

-- Per-contact maintenance pause
alter table public.contacts
  add column if not exists is_tracking_paused boolean not null default false;

-- Idempotent maintenance reminder dispatch log
create table if not exists public.maintenance_reminder_log (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  days_remaining_threshold integer not null check (days_remaining_threshold in (14, 5)),
  last_logged_at timestamptz not null,
  sent_at timestamptz not null default now(),
  unique (contact_id, days_remaining_threshold, last_logged_at)
);

create index if not exists maintenance_reminder_log_contact_id_idx
  on public.maintenance_reminder_log (contact_id);

alter table public.maintenance_reminder_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'maintenance_reminder_log' and policyname = 'maintenance_reminder_log_select'
  ) then
    create policy "maintenance_reminder_log_select"
      on public.maintenance_reminder_log for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'maintenance_reminder_log' and policyname = 'maintenance_reminder_log_insert'
  ) then
    create policy "maintenance_reminder_log_insert"
      on public.maintenance_reminder_log for insert
      with check (true);
  end if;
end $$;

notify pgrst, 'reload schema';
