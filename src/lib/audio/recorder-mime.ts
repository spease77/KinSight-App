/** MIME types probed in order; iOS Safari often supports none explicitly and needs default `MediaRecorder(stream)`. */
export const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/aac",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

export type RecorderMimeSelection =
  | { mimeType: string; useDefaultConstructor: false }
  | { mimeType: string; useDefaultConstructor: true };

/**
 * Pick the best explicit MIME type, or signal that the browser default recorder should be used.
 */
export function pickRecorderMimeType(): RecorderMimeSelection | null {
  if (typeof MediaRecorder === "undefined") return null;

  for (const mime of RECORDER_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return { mimeType: mime, useDefaultConstructor: false };
    }
  }

  return { mimeType: "", useDefaultConstructor: true };
}

export function createMediaRecorderForStream(stream: MediaStream): {
  recorder: MediaRecorder;
  mimeType: string;
} {
  const selection = pickRecorderMimeType();

  if (selection && !selection.useDefaultConstructor) {
    try {
      const recorder = new MediaRecorder(stream, { mimeType: selection.mimeType });
      return {
        recorder,
        mimeType: recorder.mimeType || selection.mimeType,
      };
    } catch (explicitError) {
      console.warn(
        "[KinSight voice] Explicit MediaRecorder mime failed; using browser default.",
        selection.mimeType,
        explicitError
      );
    }
  }

  const recorder = new MediaRecorder(stream);
  const resolved = recorder.mimeType || selection?.mimeType || "audio/mp4";
  return { recorder, mimeType: resolved };
}

/** Strip codec parameters (e.g. audio/webm;codecs=opus → audio/webm) for storage allowlists */
export function normalizeMimeTypeForStorage(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase();
  if (!base) return "audio/mp4";
  return base;
}

export function extensionForMimeType(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes("mp4") || lower.includes("m4a")) return "m4a";
  if (lower.includes("aac")) return "aac";
  if (lower.includes("ogg")) return "ogg";
  if (lower.includes("wav")) return "wav";
  if (lower.includes("mpeg") || lower.includes("mp3")) return "mp3";
  if (lower.includes("webm")) return "webm";
  return "m4a";
}
