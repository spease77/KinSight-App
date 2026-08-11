/** Central model routing for KinSight AI pipeline */

const speedMode = process.env.KINSIGHT_SPEED_MODE !== "false";

export const MODELS = {
  /** gpt-4o-mini-transcribe is faster than whisper-1 */
  transcription:
    process.env.OPENAI_TRANSCRIBE_MODEL ??
    (speedMode ? "gpt-4o-mini-transcribe" : "whisper-1"),
  parse: "gpt-4.1-mini" as const,
  /** Haiku is much faster; set ANTHROPIC_AGENT_MODEL=claude-sonnet-4-6 for max intelligence */
  agent:
    process.env.ANTHROPIC_AGENT_MODEL ??
    (speedMode ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6"),
  /** tts-1 is faster than tts-1-hd */
  tts: process.env.OPENAI_TTS_MODEL ?? (speedMode ? "tts-1" : "tts-1-hd"),
} as const;

/** OpenAI TTS voices: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer */
export const TTS_VOICE = (process.env.OPENAI_TTS_VOICE ?? "coral") as
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "fable"
  | "nova"
  | "onyx"
  | "sage"
  | "shimmer";

export const TTS_SPEED = Number(process.env.OPENAI_TTS_SPEED ?? "0.96");

export const AGENT_MAX_OUTPUT_TOKENS = Number(
  process.env.AGENT_MAX_OUTPUT_TOKENS ?? (speedMode ? "500" : "700")
);
