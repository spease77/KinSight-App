-- Persist signed storage URL on voice recordings (refreshed on upload)
alter table public.voice_recordings
  add column if not exists audio_url text;

comment on column public.contacts.source_metadata is
  'Per-field provenance JSON: excerpt (verbatim snippet), audioUrl, storagePath, recordingId, startMs, endMs';
