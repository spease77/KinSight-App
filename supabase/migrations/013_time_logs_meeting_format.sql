alter table public.time_logs
  add column if not exists meeting_format text
  check (
    meeting_format is null
    or meeting_format in ('in_person', 'phone', 'video_call')
  );

notify pgrst, 'reload schema';
