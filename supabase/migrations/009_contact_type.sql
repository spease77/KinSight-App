-- Contact relationship category: professional, personal, or family
alter table public.contacts
  add column if not exists contact_type text
  check (contact_type is null or contact_type in ('professional', 'personal', 'family'));

alter table public.contacts
  add column if not exists contact_type_needs_confirmation boolean not null default false;

create index if not exists contacts_contact_type_idx
  on public.contacts (contact_type);

notify pgrst, 'reload schema';
