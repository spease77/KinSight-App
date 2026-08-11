export interface ContactNoteEntry {
  id: string;
  recordedAt: string;
  content: string;
}

const LOG_SEPARATOR = /\n\n---\n\n/;
const NOTE_LOG_HEADER_PATTERN =
  /^\d{2}-\d{2}-\d{4}(?:\s+\d{1,2}:\d{2}(?:\s?[AP]M)?)?$/i;

const SYSTEM_NOTE_PREFIXES = [
  "Profile updated:",
  "Contact type changed:",
  "Contact type set to ",
  "Profile photo updated.",
  "Profile photo removed.",
  "Contact added manually.",
  "Imported from device contacts:",
] as const;

function isTimestampOnlyContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  return NOTE_LOG_HEADER_PATTERN.test(trimmed);
}

function isProfileFieldAuditLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const colonIndex = trimmed.indexOf(":");
  if (colonIndex <= 0) return false;

  const label = trimmed.slice(0, colonIndex).trim();
  const value = trimmed.slice(colonIndex + 1).trim();
  if (!value) return false;

  const looksLikeProfileLabel =
    label.includes(" - ") ||
    /^(Email|Phone|Birthday|Address|Company|Religion|Interests?)\b/i.test(
      label
    );

  if (!looksLikeProfileLabel) return false;

  return (
    value === "cleared" ||
    value.includes("→") ||
    /^[^:]+:\s*\S/.test(trimmed)
  );
}

function isPhoneOrEmailImportStub(content: string): boolean {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return false;

  return lines.every((line) => /^(Phone|Email):\s+\S/.test(line));
}

export function isSystemGeneratedNoteContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed || isTimestampOnlyContent(trimmed)) return true;

  for (const prefix of SYSTEM_NOTE_PREFIXES) {
    if (trimmed.startsWith(prefix)) return true;
  }

  if (/^Imported \d+ notes? from file\b/i.test(trimmed)) return true;
  if (isPhoneOrEmailImportStub(trimmed)) return true;

  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 0 && lines.every((line) => isProfileFieldAuditLine(line))) {
    return true;
  }

  return false;
}

export function filterUserAuthoredNotes(
  entries: ContactNoteEntry[]
): ContactNoteEntry[] {
  return entries.filter(
    (entry) => !isSystemGeneratedNoteContent(entry.content)
  );
}

export function getLatestUserAuthoredNote(
  entries: ContactNoteEntry[]
): ContactNoteEntry | null {
  let latest: ContactNoteEntry | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;

  for (const entry of filterUserAuthoredNotes(entries)) {
    const entryTime = new Date(entry.recordedAt).getTime();
    if (Number.isNaN(entryTime)) continue;
    if (entryTime >= latestTime) {
      latest = entry;
      latestTime = entryTime;
    }
  }

  return latest;
}

export function formatUserAuthoredNoteValue(
  entry: ContactNoteEntry,
  maxLength = 500
): string {
  const text = entry.content.trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export function resolveUserAuthoredNoteDisplay(
  contact: {
    notes?: string;
    notesLog?: ContactNoteEntry[];
  },
  maxLength = 500
): string | null {
  const latestFromLog = getLatestUserAuthoredNote(contact.notesLog ?? []);
  if (latestFromLog) {
    return formatUserAuthoredNoteValue(latestFromLog, maxLength);
  }

  const legacy = contact.notes?.trim();
  if (!legacy) return null;

  const parsedLegacy = migrateLegacyNotesLog({ notes: legacy });
  const latestLegacy = getLatestUserAuthoredNote(parsedLegacy);
  if (latestLegacy) {
    return formatUserAuthoredNoteValue(latestLegacy, maxLength);
  }

  if (isSystemGeneratedNoteContent(legacy)) return null;

  if (legacy.length <= maxLength) return legacy;
  return `${legacy.slice(0, maxLength - 1)}…`;
}

export function formatNoteLogTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${mm}-${dd}-${yyyy} ${timePart}`;
}

export function sortNotesNewestFirst(entries: ContactNoteEntry[]): ContactNoteEntry[] {
  return [...entries].sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );
}

export function serializeNotesLog(entries: ContactNoteEntry[]): string {
  return sortNotesNewestFirst(entries)
    .map(
      (entry) =>
        `${formatNoteLogTimestamp(entry.recordedAt)}\n${entry.content.trim()}`
    )
    .join("\n\n");
}

export function createNoteEntry(
  content: string,
  recordedAt?: string
): ContactNoteEntry | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  return {
    id: crypto.randomUUID(),
    recordedAt: recordedAt ?? new Date().toISOString(),
    content: trimmed,
  };
}

export function appendNoteEntry(
  existing: ContactNoteEntry[],
  content: string,
  recordedAt?: string
): ContactNoteEntry[] {
  const entry = createNoteEntry(content, recordedAt);
  if (!entry) return existing;

  const duplicate = existing.some(
    (item) =>
      item.content.trim() === entry.content.trim() &&
      item.recordedAt === entry.recordedAt
  );
  if (duplicate) return existing;

  return sortNotesNewestFirst([entry, ...existing]);
}

function parseSerializedNotesLog(notes: string | null | undefined): ContactNoteEntry[] {
  if (!notes?.trim()) return [];

  const blocks = notes.split(/\n\n(?=\d{2}-\d{2}-\d{4})/);
  const entries: ContactNoteEntry[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length === 0) continue;

    const header = lines[0].trim();
    const content = lines.slice(1).join("\n").trim();
    if (!content) continue;

    const parsed = Date.parse(header);
    entries.push({
      id: crypto.randomUUID(),
      recordedAt: Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString(),
      content,
    });
  }

  return sortNotesNewestFirst(entries);
}

export function migrateLegacyNotesLog(input: {
  notes_log?: unknown;
  notes?: string | null;
  inquiry_transcript?: string | null;
  created_at?: string;
  updated_at?: string;
}): ContactNoteEntry[] {
  if (Array.isArray(input.notes_log) && input.notes_log.length > 0) {
    return sanitizeNotesLog(input.notes_log);
  }

  const entries: ContactNoteEntry[] = [];
  const createdAt = input.created_at ?? new Date().toISOString();
  const updatedAt = input.updated_at ?? createdAt;

  if (input.inquiry_transcript?.trim()) {
    const chunks = input.inquiry_transcript
      .split(LOG_SEPARATOR)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    chunks.forEach((chunk, index) => {
      const entry = createNoteEntry(
        chunk,
        index === chunks.length - 1 ? updatedAt : createdAt
      );
      if (entry) entries.push(entry);
    });
  }

  if (input.notes?.trim()) {
    const notesText = input.notes.trim();
    const alreadyLogged = entries.some((entry) => entry.content === notesText);
    if (!alreadyLogged) {
      const fromSerialized = parseSerializedNotesLog(notesText);
      if (fromSerialized.length > 0) {
        entries.push(...fromSerialized);
      } else {
        const entry = createNoteEntry(notesText, createdAt);
        if (entry) entries.push(entry);
      }
    }
  }

  return sortNotesNewestFirst(deduplicateEntries(entries));
}

export function sanitizeNotesLog(raw: unknown): ContactNoteEntry[] {
  if (!Array.isArray(raw)) return [];

  const entries: ContactNoteEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const content = typeof record.content === "string" ? record.content.trim() : "";
    const recordedAt =
      typeof record.recordedAt === "string" ? record.recordedAt : "";
    if (!content || !recordedAt) continue;

    entries.push({
      id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
      recordedAt,
      content,
    });
  }

  return sortNotesNewestFirst(deduplicateEntries(entries));
}

function deduplicateEntries(entries: ContactNoteEntry[]): ContactNoteEntry[] {
  const seen = new Set<string>();
  const result: ContactNoteEntry[] = [];

  for (const entry of entries) {
    const key = `${entry.recordedAt}::${entry.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }

  return result;
}

export function getNotesLogPreview(
  entries: ContactNoteEntry[],
  maxLength = 160
): string {
  if (entries.length === 0) return "No activity yet. Tap to open KinSight activity history.";

  const latest = sortNotesNewestFirst(entries)[0];
  const header = formatNoteLogTimestamp(latest.recordedAt);
  const text = `${header}\n${latest.content}`;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export function buildNoteLogContent(
  transcript: string,
  supplemental?: string | null
): string {
  const parts = [transcript.trim()];
  const extra = supplemental?.trim();
  if (extra && !transcript.includes(extra)) {
    parts.push(extra);
  }
  return parts.filter(Boolean).join("\n\n");
}

export type NotesLogExportFormat = "json" | "txt";

export function buildNotesLogExportFilename(
  contactName: string,
  format: NotesLogExportFormat
): string {
  const safe =
    contactName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") ||
    "contact";
  const date = new Date().toISOString().slice(0, 10);
  return `${safe}-notes-log-${date}.${format}`;
}

export function buildNotesLogJsonExport(entries: ContactNoteEntry[]): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: sortNotesNewestFirst(entries),
    },
    null,
    2
  );
}

export function downloadNotesLog(
  contactName: string,
  entries: ContactNoteEntry[],
  format: NotesLogExportFormat
): void {
  const content =
    format === "json"
      ? buildNotesLogJsonExport(entries)
      : serializeNotesLog(entries);
  const blob = new Blob([content], {
    type: format === "json" ? "application/json" : "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildNotesLogExportFilename(contactName, format);
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseImportedNotesLog(raw: string): ContactNoteEntry[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const data = JSON.parse(trimmed) as unknown;
      if (Array.isArray(data)) {
        return sanitizeNotesLog(data);
      }
      if (
        data &&
        typeof data === "object" &&
        Array.isArray((data as { entries?: unknown }).entries)
      ) {
        return sanitizeNotesLog((data as { entries: unknown }).entries);
      }
    } catch {
      return [];
    }
  }

  const serialized = parseSerializedNotesLog(trimmed);
  if (serialized.length > 0) return serialized;

  const chunks = trimmed
    .split(/\n\n---\n\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (chunks.length > 1) {
    return sortNotesNewestFirst(
      chunks
        .map((content) => createNoteEntry(content))
        .filter((entry): entry is ContactNoteEntry => entry !== null)
    );
  }

  const single = createNoteEntry(trimmed);
  return single ? [single] : [];
}

export function mergeNotesLogImports(
  existing: ContactNoteEntry[],
  imported: ContactNoteEntry[],
  mode: "merge" | "replace"
): ContactNoteEntry[] {
  const cleaned = sanitizeNotesLog(imported);
  if (mode === "replace") return cleaned;
  return sortNotesNewestFirst(deduplicateEntries([...cleaned, ...existing]));
}

export function buildNotesLogKnowledgeLines(
  entries: ContactNoteEntry[],
  maxTotalChars = 6000,
  maxEntryChars = 800
): string[] {
  const lines: string[] = [];
  let used = 0;

  for (const entry of sortNotesNewestFirst(entries)) {
    const stamp = formatNoteLogTimestamp(entry.recordedAt);
    const body =
      entry.content.length > maxEntryChars
        ? `${entry.content.slice(0, maxEntryChars - 1)}…`
        : entry.content;
    const line = `  Notes (${stamp}): ${body}`;
    if (used + line.length > maxTotalChars) break;
    lines.push(line);
    used += line.length;
  }

  return lines;
}
