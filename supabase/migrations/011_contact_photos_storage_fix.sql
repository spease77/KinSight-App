-- Fix contact photo storage permissions (run in Supabase SQL Editor)

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
