import {
  openAiTranscribeErrorMessage,
  transcribeAudioBuffer,
} from "@/lib/audio/transcribe-buffer";
import { saveVoiceRecording } from "@/lib/supabase/voice-recordings";

export const maxDuration = 60;

const MIN_AUDIO_BYTES = 1000;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is missing from .env.local" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const audio = formData.get("audio");
  const durationRaw = formData.get("durationMs");

  if (!audio || typeof audio === "string") {
    return Response.json({ error: "No audio file provided" }, { status: 400 });
  }

  const mimeType = ("type" in audio && audio.type) || "audio/webm";
  const buffer = Buffer.from(await audio.arrayBuffer());
  const durationMs =
    typeof durationRaw === "string" ? Number(durationRaw) : undefined;

  if (buffer.byteLength < MIN_AUDIO_BYTES) {
    return Response.json(
      {
        error:
          "Recording too short or empty. Hold the mic button and speak for at least 2–3 seconds.",
      },
      { status: 400 }
    );
  }

  try {
    const text = await transcribeAudioBuffer(buffer, mimeType);

    const { recording, error } = await saveVoiceRecording({
      buffer,
      mimeType,
      transcript: text,
      durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
    });

    if (error || !recording) {
      return Response.json(
        { error: error ?? "Could not save voice note" },
        { status: 500 }
      );
    }

    return Response.json({
      recordingId: recording.id,
      text,
      durationMs: recording.duration_ms,
      audioUrl: recording.audioUrl,
      storagePath: recording.storage_path,
    });
  } catch (err) {
    console.error("Recording pipeline error:", err);
    return Response.json(
      { error: openAiTranscribeErrorMessage(err) },
      { status: 500 }
    );
  }
}
