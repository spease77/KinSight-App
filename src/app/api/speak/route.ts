import OpenAI from "openai";
import {
  isElevenLabsConfigured,
  synthesizeElevenLabs,
} from "@/lib/audio/elevenlabs-tts";
import { MODELS, TTS_SPEED, TTS_VOICE } from "@/lib/ai/models";
import { readEnv } from "@/lib/supabase/server";

export const maxDuration = 30;

const MAX_CHARS = 4096;

function plainTextForTts(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
}

async function synthesizeOpenAI(text: string): Promise<Buffer> {
  const apiKey = readEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const openai = new OpenAI({ apiKey });
  const base = {
    model: MODELS.tts,
    voice: TTS_VOICE,
    input: text,
    response_format: "mp3" as const,
  };

  try {
    const speech = await openai.audio.speech.create({
      ...base,
      speed: TTS_SPEED,
    });
    return Buffer.from(await speech.arrayBuffer());
  } catch (firstError) {
    console.warn("OpenAI TTS with speed failed, retrying without speed:", firstError);
    const speech = await openai.audio.speech.create(base);
    return Buffer.from(await speech.arrayBuffer());
  }
}

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };

  if (!text?.trim()) {
    return Response.json({ error: "Text is required" }, { status: 400 });
  }

  const input = plainTextForTts(text);
  if (!input) {
    return Response.json({ error: "Text is required" }, { status: 400 });
  }

  const openAiKey = readEnv("OPENAI_API_KEY");
  const elevenConfigured = isElevenLabsConfigured();

  if (!elevenConfigured && !openAiKey) {
    return Response.json(
      {
        error:
          "No TTS configured. Add OPENAI_API_KEY or ELEVENLABS_API_KEY in Vercel environment variables.",
      },
      { status: 500 }
    );
  }

  let elevenLabsError: string | null = null;
  let openAiError: string | null = null;

  const preferOpenAi = readEnv("TTS_PREFER_OPENAI") === "true";

  async function attemptOpenAi(): Promise<Response | null> {
    if (!openAiKey) return null;
    try {
      const buffer = await synthesizeOpenAI(input);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
          ...(elevenLabsError ? { "X-TTS-Fallback": "openai" } : {}),
        },
      });
    } catch (err) {
      openAiError = err instanceof Error ? err.message : "OpenAI TTS failed";
      console.error("OpenAI TTS error:", openAiError);
      return null;
    }
  }

  if (preferOpenAi || !elevenConfigured) {
    const openAiResponse = await attemptOpenAi();
    if (openAiResponse) return openAiResponse;
  }

  if (elevenConfigured) {
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
      console.error("ElevenLabs TTS error:", elevenLabsError);
    }
  }

  const openAiResponse = await attemptOpenAi();
  if (openAiResponse) return openAiResponse;

  return Response.json(
    {
      error:
        openAiError ??
        elevenLabsError ??
        "Could not generate speech audio.",
    },
    { status: 500 }
  );
}
