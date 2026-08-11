alter table public.time_logs
  drop constraint if exists time_logs_duration_minutes_check;

alter table public.time_logs
  add constraint time_logs_duration_minutes_check
  check (duration_minutes <> 0);

notify pgrst, 'reload schema';
