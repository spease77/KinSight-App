import { readEnv } from "@/lib/supabase/server";

const ELEVENLABS_API = "https://api.elevenlabs.io/v1/text-to-speech";

/** Rachel — clear, natural female (default). Browse voices at elevenlabs.io/voice-library */
export const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

const MODEL_FALLBACKS = [
  "eleven_turbo_v2_5",
  "eleven_flash_v2_5",
  "eleven_multilingual_v2",
] as const;

export function isElevenLabsConfigured(): boolean {
  return Boolean(readEnv("ELEVENLABS_API_KEY"));
}

function parseElevenLabsError(body: string): string {
  try {
    const json = JSON.parse(body) as {
      detail?: string | { message?: string; status?: string };
    };
    if (typeof json.detail === "string") return json.detail;
    if (json.detail?.message) return json.detail.message;
    return body;
  } catch {
    return body;
  }
}

async function requestSpeech(
  apiKey: string,
  voiceId: string,
  modelId: string,
  text: string,
  outputFormat: string
): Promise<Response> {
  const url = `${ELEVENLABS_API}/${voiceId}?output_format=${outputFormat}`;

  return fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: Number(readEnv("ELEVENLABS_STABILITY") ?? "0.45"),
        similarity_boost: Number(readEnv("ELEVENLABS_SIMILARITY") ?? "0.75"),
      },
    }),
  });
}

const OUTPUT_FORMAT_FALLBACKS = [
  "mp3_44100_128",
  "mp3_22050_32",
] as const;

export async function synthesizeElevenLabs(text: string): Promise<Buffer> {
  const apiKey = readEnv("ELEVENLABS_API_KEY");
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is missing");
  }

  const voiceId =
    readEnv("ELEVENLABS_VOICE_ID") || DEFAULT_ELEVENLABS_VOICE_ID;

  const preferredModel =
    readEnv("ELEVENLABS_MODEL_ID") || MODEL_FALLBACKS[0];
  const modelsToTry = [
    preferredModel,
    ...MODEL_FALLBACKS.filter((m) => m !== preferredModel),
  ];

  const configuredFormat = readEnv("ELEVENLABS_OUTPUT_FORMAT");
  const formatsToTry = configuredFormat
    ? [configuredFormat, ...OUTPUT_FORMAT_FALLBACKS.filter((f) => f !== configuredFormat)]
    : [...OUTPUT_FORMAT_FALLBACKS];

  let lastError = "ElevenLabs TTS failed";

  for (const modelId of modelsToTry) {
    for (const outputFormat of formatsToTry) {
      const res = await requestSpeech(
        apiKey,
        voiceId,
        modelId,
        text,
        outputFormat
      );

      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }

      const detail = await res.text().catch(() => res.statusText);
      lastError = parseElevenLabsError(detail);
      console.error(
        `ElevenLabs TTS error (voice=${voiceId}, model=${modelId}, format=${outputFormat}):`,
        lastError
      );

      if (res.status === 401 || res.status === 404) {
        throw new Error(lastError);
      }
    }
  }

  throw new Error(lastError);
}
