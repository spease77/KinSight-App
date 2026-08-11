const ELEVENLABS_API = "https://api.elevenlabs.io/v1/text-to-speech";

/** Rachel — clear, natural female (default). Browse voices at elevenlabs.io/voice-library */
export const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

const MODEL_FALLBACKS = [
  "eleven_turbo_v2_5",
  "eleven_flash_v2_5",
  "eleven_multilingual_v2",
] as const;

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
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
  text: string
): Promise<Response> {
  const outputFormat =
    process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || "mp3_44100_128";
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
        stability: Number(process.env.ELEVENLABS_STABILITY ?? "0.45"),
        similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY ?? "0.75"),
      },
    }),
  });
}

export async function synthesizeElevenLabs(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is missing from .env.local");
  }

  const voiceId =
    process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_ELEVENLABS_VOICE_ID;

  const preferredModel =
    process.env.ELEVENLABS_MODEL_ID?.trim() || MODEL_FALLBACKS[0];
  const modelsToTry = [
    preferredModel,
    ...MODEL_FALLBACKS.filter((m) => m !== preferredModel),
  ];

  let lastError = "ElevenLabs TTS failed";

  for (const modelId of modelsToTry) {
    const res = await requestSpeech(apiKey, voiceId, modelId, text);

    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }

    const detail = await res.text().catch(() => res.statusText);
    lastError = parseElevenLabsError(detail);
    console.error(
      `ElevenLabs TTS error (voice=${voiceId}, model=${modelId}):`,
      lastError
    );

    // Don't retry on auth or missing voice — those won't fix with another model
    if (res.status === 401 || res.status === 404 || res.status === 422) {
      break;
    }
  }

  throw new Error(lastError);
}
