-- Domain-verified company news cache (7-day TTL in app code)
alter table public.contacts
  add column if not exists company_news jsonb;

notify pgrst, 'reload schema';
