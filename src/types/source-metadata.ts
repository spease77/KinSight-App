/** Voice note provenance (entry_method = voice) */
export type VoiceFieldSourceMetadata = {
  source_type?: "voice";
  recordingId: string;
  storagePath: string;
  audioUrl: string;
  excerpt: string;
  startMs: number;
  endMs: number;
  capturedAt: string;
};

/** Typed manual entry (entry_method = manual) */
export type ManualFieldSourceMetadata = {
  source_type: "manual_entry";
  updated_at: string;
};

export type FieldSourceMetadata =
  | VoiceFieldSourceMetadata
  | ManualFieldSourceMetadata;

/** Keys are contact scalar fields or ContactProfileFieldKey strings */
export type ContactSourceMetadata = Partial<
  Record<string, FieldSourceMetadata>
>;

export function isVoiceSource(
  source: FieldSourceMetadata
): source is VoiceFieldSourceMetadata {
  return (
    "recordingId" in source &&
    typeof source.recordingId === "string" &&
    Boolean(source.recordingId)
  );
}

export function isManualSource(
  source: FieldSourceMetadata
): source is ManualFieldSourceMetadata {
  return source.source_type === "manual_entry";
}

export function sanitizeSourceMetadata(
  input: unknown
): ContactSourceMetadata {
  if (!input || typeof input !== "object") return {};

  const result: ContactSourceMetadata = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;

    if (v.source_type === "manual_entry") {
      const updated_at =
        typeof v.updated_at === "string" ? v.updated_at.trim() : "";
      if (!updated_at) continue;
      result[key] = { source_type: "manual_entry", updated_at };
      continue;
    }

    if (typeof v.recordingId !== "string" || !v.recordingId) continue;
    if (typeof v.excerpt !== "string" || !v.excerpt.trim()) continue;

    const storagePath =
      typeof v.storagePath === "string" ? v.storagePath : "";
    const audioUrl =
      typeof v.audioUrl === "string"
        ? v.audioUrl
        : typeof v.audio_url === "string"
          ? v.audio_url
          : "";

    result[key] = {
      source_type: "voice",
      recordingId: v.recordingId,
      storagePath,
      audioUrl,
      excerpt: v.excerpt.trim(),
      startMs: typeof v.startMs === "number" ? v.startMs : 0,
      endMs: typeof v.endMs === "number" ? v.endMs : 5000,
      capturedAt:
        typeof v.capturedAt === "string"
          ? v.capturedAt
          : new Date().toISOString(),
    };
  }

  return result;
}

/** Inline marker the agent appends after saved facts: ⟨contactId:fieldKey⟩ */
export const SOURCE_MARKER_REGEX =
  /⟨([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):([a-zA-Z][a-zA-Z0-9]*)⟩/g;

/** Hidden tag embedded in voice user messages (optional 🎤 prefix) */
export const RECORDING_TAG_REGEX =
  /^(?:🎤\s*)?\[recording:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\s*/i;
