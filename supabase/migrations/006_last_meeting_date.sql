-- Resolved calendar date for last meeting (YYYY-MM-DD)
alter table public.contacts
  add column if not exists last_meeting_date text;

create index if not exists contacts_last_meeting_date_idx
  on public.contacts (last_meeting_date);
