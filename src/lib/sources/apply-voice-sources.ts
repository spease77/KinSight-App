import type { ParsedContactFields } from "@/lib/ai/contact-schema";
import type { ContactProfileFieldKey } from "@/types/contact-profile";
import { estimateClipTimestamps } from "@/lib/sources/build-source-metadata";
import type {
  ContactSourceMetadata,
  ManualFieldSourceMetadata,
  VoiceFieldSourceMetadata,
} from "@/types/source-metadata";

const SCALAR_SOURCE_KEYS: Record<keyof ParsedContactFields, string | null> = {
  name: null,
  company: "company",
  role: "role",
  notes: "notes",
  last_contact: "lastContact",
  last_meeting_date: "lastMeetingDate",
  next_steps: "nextSteps",
  topics: "topics",
  contact_type: "contactType",
  contact_type_needs_confirmation: null,
};

export function listPopulatedFieldKeys(input: {
  parsed: ParsedContactFields;
  profileFields: Partial<Record<ContactProfileFieldKey, string>>;
}): string[] {
  const keys: string[] = [];

  for (const [parsedKey, metaKey] of Object.entries(SCALAR_SOURCE_KEYS)) {
    if (!metaKey) continue;
    const value = input.parsed[parsedKey as keyof ParsedContactFields];
    if (value == null) continue;
    const text = Array.isArray(value) ? value.join(", ") : String(value);
    if (text.trim()) keys.push(metaKey);
  }

  for (const key of Object.keys(input.profileFields)) {
    if (input.profileFields[key as ContactProfileFieldKey]?.trim()) {
      keys.push(key);
    }
  }

  return keys;
}

export function buildManualSourcesForFields(
  fieldKeys: string[],
  updatedAt: string
): ContactSourceMetadata {
  const sources: Record<string, ManualFieldSourceMetadata> = {};

  for (const fieldKey of fieldKeys) {
    sources[fieldKey] = {
      source_type: "manual_entry",
      updated_at: updatedAt,
    };
  }

  return sources;
}

export function buildVoiceSourcesFromSnippets(input: {
  recordingId: string;
  storagePath: string;
  audioUrl: string;
  transcript: string;
  durationMs: number;
  sourceSnippets: Record<string, string>;
}): ContactSourceMetadata {
  const sources: Record<string, VoiceFieldSourceMetadata> = {};
  const capturedAt = new Date().toISOString();

  for (const [fieldKey, snippet] of Object.entries(input.sourceSnippets)) {
    if (!snippet.trim()) continue;

    const { startMs, endMs } = estimateClipTimestamps(
      input.transcript,
      snippet,
      input.durationMs
    );

    sources[fieldKey] = {
      source_type: "voice",
      recordingId: input.recordingId,
      storagePath: input.storagePath,
      audioUrl: input.audioUrl,
      excerpt: snippet.trim(),
      startMs,
      endMs,
      capturedAt,
    };
  }

  return sources;
}

export function mergeContactSourceMetadata(
  existing: ContactSourceMetadata,
  incoming: ContactSourceMetadata
): ContactSourceMetadata {
  return { ...existing, ...incoming };
}
