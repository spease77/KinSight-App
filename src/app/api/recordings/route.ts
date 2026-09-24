import {
  openAiTranscribeErrorMessage,
  transcribeAudioBuffer,
} from "@/lib/audio/transcribe-buffer";
import { saveVoiceRecording } from "@/lib/supabase/voice-recordings";
import { after } from "next/server";

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
  const clientTranscriptRaw = formData.get("clientTranscript");
  const clientTranscript =
    typeof clientTranscriptRaw === "string" ? clientTranscriptRaw.trim() : "";

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
    const text = clientTranscript
      ? clientTranscript
      : await transcribeAudioBuffer(buffer, mimeType);

    after(async () => {
      try {
        await saveVoiceRecording({
          buffer,
          mimeType,
          transcript: text,
          durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
        });
      } catch (saveErr) {
        console.error("Background voice recording save failed:", saveErr);
      }
    });

    return Response.json({
      recordingId: "",
      text,
      durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
    });
  } catch (err) {
    console.error("Recording pipeline error:", err);
    return Response.json(
      { error: openAiTranscribeErrorMessage(err) },
      { status: 500 }
    );
  }
}
