import {
  getVoiceRecording,
  resolveRecordingAudioUrl,
} from "@/lib/supabase/voice-recordings";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { recording, error } = await getVoiceRecording(id);

  if (error || !recording) {
    return Response.json({ error: "Recording not found" }, { status: 404 });
  }

  const audioUrl = await resolveRecordingAudioUrl(recording);

  return Response.json({
    id: recording.id,
    contactId: recording.contact_id,
    transcript: recording.transcript,
    durationMs: recording.duration_ms,
    mimeType: recording.mime_type,
    storagePath: recording.storage_path,
    createdAt: recording.created_at,
    audioUrl,
  });
}
