import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { MODELS } from "@/lib/ai/models";

function extensionFromMime(mimeType: string): string {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
}

export function openAiTranscribeErrorMessage(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 401) {
      return "OpenAI API key is invalid. Check OPENAI_API_KEY in .env.local.";
    }
    if (err.status === 429) {
      return "OpenAI rate limit or billing issue. Check your account credits.";
    }
    if (err.message) return err.message;
  }

  if (err instanceof Error && err.message) return err.message;
  return "Transcription failed. Please try recording again.";
}

export async function transcribeAudioBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing from .env.local");
  }

  const extension = extensionFromMime(mimeType);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const file = await toFile(buffer, `recording.${extension}`, { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: MODELS.transcription,
    language: "en",
    response_format: "json",
  });

  return transcription.text ?? "";
}
