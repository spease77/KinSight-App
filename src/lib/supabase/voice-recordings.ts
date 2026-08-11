import { createServerSupabase } from "@/lib/supabase/server";
import { normalizeMimeTypeForStorage } from "@/lib/audio/recorder-mime";
import { randomUUID } from "crypto";

export const VOICE_NOTES_BUCKET = "voice-notes";

/** Signed URL lifetime stored on the recording row (7 days) */
const STORED_URL_TTL_SEC = 60 * 60 * 24 * 7;

export type VoiceRecordingRow = {
  id: string;
  contact_id: string | null;
  storage_path: string;
  mime_type: string;
  duration_ms: number | null;
  transcript: string;
  audio_url: string | null;
  created_at: string;
};

export type SavedVoiceRecording = VoiceRecordingRow & {
  audioUrl: string;
};

export async function saveVoiceRecording(input: {
  buffer: Buffer;
  mimeType: string;
  transcript: string;
  durationMs?: number;
  contactId?: string;
}): Promise<{ recording: SavedVoiceRecording | null; error?: string }> {
  const supabase = createServerSupabase();
  const id = randomUUID();
  const mimeType = normalizeMimeTypeForStorage(input.mimeType);
  const ext = mimeType.includes("mp4")
    ? "m4a"
    : mimeType.includes("ogg")
      ? "ogg"
      : "webm";
  const storagePath = `recordings/${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(VOICE_NOTES_BUCKET)
    .upload(storagePath, input.buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error("voice upload error:", uploadError.message);
    return {
      recording: null,
      error: `Could not store voice note: ${uploadError.message}`,
    };
  }

  const audioUrl = await getRecordingSignedUrl(storagePath, STORED_URL_TTL_SEC);
  if (!audioUrl) {
    return {
      recording: null,
      error: "Audio uploaded but could not generate storage URL.",
    };
  }

  const { data, error } = await supabase
    .from("voice_recordings")
    .insert({
      id,
      contact_id: input.contactId ?? null,
      storage_path: storagePath,
      mime_type: mimeType,
      duration_ms: input.durationMs ?? null,
      transcript: input.transcript,
      audio_url: audioUrl,
    } as never)
    .select()
    .single();

  if (error) {
    console.error("voice_recordings insert error:", error.message);
    return { recording: null, error: error.message };
  }

  const row = data as VoiceRecordingRow;
  return {
    recording: {
      ...row,
      audioUrl: row.audio_url ?? audioUrl,
    },
  };
}

export async function getVoiceRecording(
  id: string
): Promise<{ recording: VoiceRecordingRow | null; error?: string }> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("voice_recordings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { recording: null, error: error.message };
  }

  return { recording: data as VoiceRecordingRow };
}

export async function linkRecordingToContact(
  recordingId: string,
  contactId: string
): Promise<void> {
  const supabase = createServerSupabase();
  await supabase
    .from("voice_recordings")
    .update({ contact_id: contactId } as never)
    .eq("id", recordingId);
}

export async function getRecordingSignedUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.storage
    .from(VOICE_NOTES_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("signed url error:", error?.message);
    return null;
  }

  return data.signedUrl;
}

export async function resolveRecordingAudioUrl(
  recording: VoiceRecordingRow
): Promise<string | null> {
  if (recording.audio_url) return recording.audio_url;
  return getRecordingSignedUrl(recording.storage_path);
}
