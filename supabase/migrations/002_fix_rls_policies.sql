-- Run in Supabase SQL Editor if contact saves are failing
-- Ensures the contacts table exists with correct permissions

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Unknown Contact',
  company text,
  role text,
  status text not null default 'warm' check (status in ('hot', 'warm', 'cold')),
  notes text,
  last_contact text,
  next_steps text,
  topics text[],
  inquiry_transcript text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contacts enable row level security;

drop policy if exists "Allow public read access" on public.contacts;
drop policy if exists "Allow public insert access" on public.contacts;
drop policy if exists "Allow public update access" on public.contacts;
drop policy if exists "Enable read for all" on public.contacts;
drop policy if exists "Enable insert for all" on public.contacts;
drop policy if exists "Enable update for all" on public.contacts;

create policy "Enable read for all"
  on public.contacts for select
  to anon, authenticated, service_role
  using (true);

create policy "Enable insert for all"
  on public.contacts for insert
  to anon, authenticated, service_role
  with check (true);

create policy "Enable update for all"
  on public.contacts for update
  to anon, authenticated, service_role
  using (true)
  with check (true);
