-- KinSight contacts table
-- Run this in Supabase Dashboard → SQL Editor

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

create index if not exists contacts_created_at_idx on public.contacts (created_at desc);

alter table public.contacts enable row level security;

create policy "Allow public read access"
  on public.contacts for select
  using (true);

create policy "Allow public insert access"
  on public.contacts for insert
  with check (true);

create policy "Allow public update access"
  on public.contacts for update
  using (true);
