-- Contact profile photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contact-photos',
  'contact-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

alter table public.contacts
  add column if not exists avatar_storage_path text;

alter table public.contacts
  add column if not exists avatar_url text;

alter table storage.objects enable row level security;

drop policy if exists "contact_photos_storage_insert" on storage.objects;
drop policy if exists "contact_photos_storage_select" on storage.objects;
drop policy if exists "contact_photos_storage_update" on storage.objects;

create policy "contact_photos_storage_insert"
  on storage.objects for insert
  to public
  with check (bucket_id = 'contact-photos');

create policy "contact_photos_storage_select"
  on storage.objects for select
  to public
  using (bucket_id = 'contact-photos');

create policy "contact_photos_storage_update"
  on storage.objects for update
  to public
  using (bucket_id = 'contact-photos')
  with check (bucket_id = 'contact-photos');

notify pgrst, 'reload schema';
