import OpenAI from "openai";
import {
  isElevenLabsConfigured,
  synthesizeElevenLabs,
} from "@/lib/audio/elevenlabs-tts";
import { MODELS, TTS_SPEED, TTS_VOICE } from "@/lib/ai/models";

export const maxDuration = 30;

const MAX_CHARS = 4096;

async function synthesizeOpenAI(text: string): Promise<Buffer> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing from .env.local");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const speech = await openai.audio.speech.create({
    model: MODELS.tts,
    voice: TTS_VOICE,
    input: text,
    response_format: "mp3",
    speed: TTS_SPEED,
  });

  return Buffer.from(await speech.arrayBuffer());
}

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };

  if (!text?.trim()) {
    return Response.json({ error: "Text is required" }, { status: 400 });
  }

  const input = text.trim().slice(0, MAX_CHARS);

  if (!isElevenLabsConfigured() && !process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error:
          "No TTS configured. Add ELEVENLABS_API_KEY or OPENAI_API_KEY to .env.local",
      },
      { status: 500 }
    );
  }

  let elevenLabsError: string | null = null;

  if (isElevenLabsConfigured()) {
    try {
      const buffer = await synthesizeElevenLabs(input);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      elevenLabsError =
        err instanceof Error ? err.message : "ElevenLabs TTS failed";
      console.error("ElevenLabs failed, trying OpenAI fallback:", elevenLabsError);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const buffer = await synthesizeOpenAI(input);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
          ...(elevenLabsError
            ? { "X-TTS-Fallback": "openai" }
            : {}),
        },
      });
    } catch (err) {
      console.error("OpenAI TTS fallback error:", err);
    }
  }

  return Response.json(
    {
      error:
        elevenLabsError ??
        "Could not generate speech audio. Check your ElevenLabs voice ID and API key.",
    },
    { status: 500 }
  );
}
