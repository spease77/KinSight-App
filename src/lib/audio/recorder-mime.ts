const MIME_CANDIDATES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;

  const isAppleMobile =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const candidates = isAppleMobile
    ? (["audio/mp4", "audio/webm", "audio/ogg"] as const)
    : MIME_CANDIDATES;

  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
}

/** Strip codec parameters (e.g. audio/webm;codecs=opus → audio/webm) for storage allowlists */
export function normalizeMimeTypeForStorage(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase();
  return base || "audio/webm";
}

export function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}
