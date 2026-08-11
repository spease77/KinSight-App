import type { FieldSourceMetadata } from "@/types/source-metadata";

const CLIP_MS = 5000;

/** Find the best matching excerpt in the transcript for a field value */
export function findTranscriptExcerpt(
  transcript: string,
  value: string
): string {
  const clean = value.trim();
  if (!clean) return transcript.slice(0, 120).trim();

  const lowerTranscript = transcript.toLowerCase();
  const lowerValue = clean.toLowerCase();

  const directIdx = lowerTranscript.indexOf(lowerValue);
  if (directIdx >= 0) {
    return transcript.slice(directIdx, directIdx + clean.length);
  }

  const words = lowerValue.split(/\s+/).filter((w) => w.length > 3);
  for (const word of words) {
    const idx = lowerTranscript.indexOf(word);
    if (idx >= 0) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(transcript.length, idx + word.length + 80);
      return transcript.slice(start, end).trim();
    }
  }

  return transcript.slice(0, Math.min(160, transcript.length)).trim();
}

export function estimateClipTimestamps(
  transcript: string,
  excerpt: string,
  durationMs: number
): { startMs: number; endMs: number } {
  const safeDuration = Math.max(durationMs, CLIP_MS);
  const lowerTranscript = transcript.toLowerCase();
  const needle = excerpt.toLowerCase().slice(0, Math.min(24, excerpt.length));
  const idx = needle ? lowerTranscript.indexOf(needle) : -1;

  if (idx < 0) {
    return { startMs: 0, endMs: Math.min(CLIP_MS, safeDuration) };
  }

  const ratio = idx / Math.max(transcript.length, 1);
  let startMs = Math.floor(ratio * safeDuration);
  startMs = Math.max(0, startMs - 500);

  let endMs = startMs + CLIP_MS;
  if (endMs > safeDuration) {
    endMs = safeDuration;
    startMs = Math.max(0, endMs - CLIP_MS);
  }

  return { startMs, endMs };
}

export function buildFieldSource(
  recordingId: string,
  transcript: string,
  fieldValue: string,
  durationMs: number
): FieldSourceMetadata {
  const excerpt = findTranscriptExcerpt(transcript, fieldValue);
  const { startMs, endMs } = estimateClipTimestamps(
    transcript,
    excerpt,
    durationMs
  );

  return {
    recordingId,
    storagePath: "",
    audioUrl: "",
    excerpt,
    startMs,
    endMs,
    capturedAt: new Date().toISOString(),
  };
}

export function mergeSourceMetadata(
  existing: Record<string, FieldSourceMetadata>,
  incoming: Record<string, FieldSourceMetadata>
): Record<string, FieldSourceMetadata> {
  return { ...existing, ...incoming };
}
