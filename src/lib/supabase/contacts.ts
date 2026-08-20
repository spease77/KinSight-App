import type { ParsedContactFields } from "@/lib/ai/contact-schema";
import type { ParsedProposedPerson } from "@/lib/ai/parse-multi-contact";
import {
  formatContactDateForDisplay,
  isContactDateProfileField,
  normalizeMeetingDate,
} from "@/lib/dates/contact-dates";
import {
  buildContactTypeProfileMeta,
  isContactType,
  resolveContactTypeFromParse,
  readContactTypeFromProfile,
  isContactTypeSchemaError,
  CONTACT_TYPE_LABELS,
  type ContactType,
} from "@/lib/contacts/contact-type";
import {
  appendNoteEntry,
  buildNoteLogContent,
  mergeNotesLogImports,
  migrateLegacyNotesLog,
  serializeNotesLog,
  type ContactNoteEntry,
} from "@/lib/contacts/notes-log";
import { parseTranscriptWithSources } from "@/lib/ai/parse-transcript";
import {
  buildRequestContext,
  type AiRequestContext,
} from "@/lib/ai/request-context";
import {
  buildManualSourcesForFields,
  buildVoiceSourcesFromSnippets,
  listPopulatedFieldKeys,
  mergeContactSourceMetadata,
} from "@/lib/sources/apply-voice-sources";
import {
  resolveContactAvatarUrl,
  uploadContactAvatar,
  deleteContactAvatarFile,
} from "@/lib/supabase/contact-photos";
import {
  OperationTimeoutError,
  withTimeout,
} from "@/lib/server/with-timeout";
import {
  buildContactSyncMatchIndex,
  buildContactSyncSummary,
  buildPhoneImportProfile,
  findContactSyncMatch,
  mergePhoneImportIntoExisting,
  normalizeSyncEmail,
  normalizeSyncPhone,
  registerRowInSyncIndex,
  type ContactSyncExistingRow,
} from "@/lib/contacts/contact-sync-merge";
import type { PhoneContactImport } from "@/lib/contacts/phone-contacts";
import {
  formatContactRelationshipForProfile,
  readContactRelationship,
  relationshipToType,
} from "@/lib/contacts/contact-relationship";
import { createServerSupabase, humanizeSupabaseFetchError } from "@/lib/supabase/server";
import {
  getVoiceRecording,
  linkRecordingToContact,
  resolveRecordingAudioUrl,
} from "@/lib/supabase/voice-recordings";
import type { Contact, ContactDetail } from "@/types/contact";
import type { ContactProfile } from "@/types/contact-profile";
import {
  applyParsedScalarsToProfile,
  composeContactName,
  ensureProfileNameFromContact,
  getAllProfileFieldsInContext,
  profileFieldExportLabel,
  sanitizeContactProfile,
} from "@/types/contact-profile";
import type { ContactStatus } from "@/types/database";
import {
  sanitizeSourceMetadata,
  type ContactSourceMetadata,
} from "@/types/source-metadata";

type ContactRow = {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  status: ContactStatus;
  contact_type?: ContactType | null;
  contact_type_needs_confirmation?: boolean;
  avatar_storage_path?: string | null;
  avatar_url?: string | null;
  notes: string | null;
  last_contact: string | null;
  last_meeting_date: string | null;
  next_steps: string | null;
  topics: string[] | null;
  inquiry_transcript: string | null;
  notes_log?: ContactNoteEntry[] | null;
  created_at?: string;
  updated_at?: string;
  profile?: ContactProfile | null;
  source_metadata?: ContactSourceMetadata | null;
  is_tracking_paused?: boolean;
};

export type ContactsResult = {
  contacts: Contact[];
  error?: string;
};

function formatLastContactDisplay(row: ContactRow): string {
  if (row.last_meeting_date?.trim()) {
    return formatContactDateForDisplay(row.last_meeting_date);
  }
  if (row.last_contact?.trim()) return row.last_contact.trim();
  return "Unknown";
}

function resolveMeetingDate(
  incoming: string | null | undefined,
  fallback?: string | null
): string | null {
  const candidate = incoming?.trim() || fallback?.trim() || null;
  if (!candidate) return null;
  return normalizeMeetingDate(candidate) ?? candidate;
}

function resolveRowContactType(row: ContactRow): {
  contactType?: ContactType;
  contactTypeNeedsConfirmation: boolean;
} {
  if (row.contact_type && isContactType(row.contact_type)) {
    return {
      contactType: row.contact_type,
      contactTypeNeedsConfirmation: row.contact_type_needs_confirmation ?? false,
    };
  }

  const fromProfile = readContactTypeFromProfile(row.profile ?? undefined);
  return {
    contactType: fromProfile.contactType ?? undefined,
    contactTypeNeedsConfirmation: fromProfile.needsConfirmation,
  };
}

async function enrichContactWithAvatar<T extends Contact>(
  contact: T,
  row: ContactRow
): Promise<T> {
  const avatarUrl = await resolveContactAvatarUrl(row);
  if (!avatarUrl) return contact;
  return { ...contact, avatarUrl };
}

function rowToContact(row: ContactRow): Contact {
  const contactTypeFields = resolveRowContactType(row);
  const relationship = readContactRelationship(row.profile ?? undefined);
  const relationshipType = relationshipToType(relationship);

  return {
    id: row.id,
    name: row.name,
    company: row.company ?? "",
    role: row.role ?? "",
    lastContact: formatLastContactDisplay(row),
    lastMeetingDate: row.last_meeting_date ?? undefined,
    contactType: contactTypeFields.contactType,
    contactTypeNeedsConfirmation: contactTypeFields.contactTypeNeedsConfirmation,
    relationship: relationship || undefined,
    relationshipType: relationshipType || undefined,
    relationshipLabel: relationship
      ? formatContactRelationshipForProfile(relationship)
      : undefined,
    notes: row.notes ?? undefined,
    nextSteps: row.next_steps ?? undefined,
    topics: row.topics ?? undefined,
    isTrackingPaused: row.is_tracking_paused ?? false,
  };
}

function resolveRowNotesLog(row: ContactRow): ContactNoteEntry[] {
  return migrateLegacyNotesLog({
    notes_log: row.notes_log,
    notes: row.notes,
    inquiry_transcript: row.inquiry_transcript,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function withAppendedNote(
  row: ContactRow,
  content: string,
  recordedAt?: string
): { notes_log: ContactNoteEntry[]; notes: string | null } {
  const log = appendNoteEntry(resolveRowNotesLog(row), content, recordedAt);
  return {
    notes_log: log,
    notes: log.length > 0 ? serializeNotesLog(log) : null,
  };
}

function resolveRecordedAt(requestContext?: AiRequestContext): string {
  if (requestContext?.current_timestamp) {
    const parsed = new Date(requestContext.current_timestamp);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function mergeTopics(
  existing: string[] | null,
  incoming: string[] | null | undefined
): string[] | null {
  if (!incoming?.length) return existing;
  const combined = [...(existing ?? []), ...incoming];
  return [...new Set(combined.map((t) => t.trim()).filter(Boolean))];
}

function resolveContactTypeFields(
  parsed: Pick<
    ParsedContactFields,
    "contact_type" | "contact_type_needs_confirmation" | "company" | "role"
  >,
  transcript?: string,
  existing?: Pick<ContactRow, "contact_type" | "contact_type_needs_confirmation">
): {
  contact_type: ContactType | null;
  contact_type_needs_confirmation: boolean;
} {
  const resolved = resolveContactTypeFromParse({
    contact_type: parsed.contact_type,
    contact_type_needs_confirmation: parsed.contact_type_needs_confirmation,
    transcript,
    company: parsed.company,
    role: parsed.role,
  });

  if (
    existing?.contact_type &&
    isContactType(existing.contact_type) &&
    !existing.contact_type_needs_confirmation &&
    resolved.needsConfirmation
  ) {
    return {
      contact_type: existing.contact_type,
      contact_type_needs_confirmation: false,
    };
  }

  return {
    contact_type: resolved.contactType,
    contact_type_needs_confirmation: resolved.needsConfirmation,
  };
}

type ContactWritePayload = Record<string, unknown>;

function isSchemaCacheColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    (lower.includes("could not find") && lower.includes("column"))
  );
}

function extractMissingSchemaColumn(message: string): string | null {
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] ?? null;
}

function withoutColumn<T extends ContactWritePayload>(
  payload: T,
  column: string
): T {
  const rest = { ...payload };
  delete rest[column];
  return rest as T;
}

function isNotesLogSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("notes_log") && isSchemaCacheColumnError(message);
}

async function updateContactRow(
  supabase: ReturnType<typeof createServerSupabase>,
  contactId: string,
  updates: ContactWritePayload
) {
  let current = updates;
  let result = await supabase
    .from("contacts")
    .update(current as never)
    .eq("id", contactId)
    .select()
    .single();

  let attempts = 0;
  while (
    result.error &&
    isSchemaCacheColumnError(result.error.message) &&
    attempts < 4
  ) {
    const missing = extractMissingSchemaColumn(result.error.message);
    if (!missing || !(missing in current)) break;

    console.warn(
      `Column ${missing} not in Supabase API schema yet; retrying without it. Run NOTIFY pgrst, 'reload schema'; in SQL Editor.`
    );
    current = withoutColumn(current, missing);
    result = await supabase
      .from("contacts")
      .update(current as never)
      .eq("id", contactId)
      .select()
      .single();
    attempts += 1;
  }

  return result;
}

async function insertContactRow(
  supabase: ReturnType<typeof createServerSupabase>,
  insert: ContactWritePayload
) {
  let current = insert;
  let result = await supabase
    .from("contacts")
    .insert(current as never)
    .select()
    .single();

  let attempts = 0;
  while (
    result.error &&
    isSchemaCacheColumnError(result.error.message) &&
    attempts < 4
  ) {
    const missing = extractMissingSchemaColumn(result.error.message);
    if (!missing || !(missing in current)) break;

    console.warn(
      `Column ${missing} not in Supabase API schema yet; retrying without it. Run NOTIFY pgrst, 'reload schema'; in SQL Editor.`
    );
    current = withoutColumn(current, missing);
    result = await supabase
      .from("contacts")
      .insert(current as never)
      .select()
      .single();
    attempts += 1;
  }

  return result;
}

async function insertContactRows(
  supabase: ReturnType<typeof createServerSupabase>,
  rows: ContactWritePayload[]
) {
  let current = rows;
  let result = await supabase.from("contacts").insert(current as never);

  let attempts = 0;
  while (
    result.error &&
    isSchemaCacheColumnError(result.error.message) &&
    attempts < 4
  ) {
    const missing = extractMissingSchemaColumn(result.error.message);
    if (!missing || !current.some((row) => missing in row)) break;

    console.warn(
      `Column ${missing} not in Supabase API schema yet; retrying without it. Run NOTIFY pgrst, 'reload schema'; in SQL Editor.`
    );
    current = current.map((row) =>
      missing in row ? withoutColumn(row, missing) : row
    );
    result = await supabase.from("contacts").insert(current as never);
    attempts += 1;
  }

  return result;
}

export async function fetchContactsForExport(): Promise<{
  contacts: ContactDetail[];
  error?: string;
}> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchContactsForExport error:", error.message);
      return { contacts: [], error: error.message };
    }

    return { contacts: (data ?? []).map(rowToContactDetail) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    return { contacts: [], error: message };
  }
}

export async function fetchContactsForExportByIds(
  contactIds: string[]
): Promise<{ contacts: ContactDetail[]; error?: string }> {
  const uniqueIds = [...new Set(contactIds.map((id) => id.trim()))].filter(
    Boolean
  );

  if (uniqueIds.length === 0) {
    return { contacts: [] };
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .in("id", uniqueIds)
      .order("name", { ascending: true });

    if (error) {
      console.error("fetchContactsForExportByIds error:", error.message);
      return { contacts: [], error: error.message };
    }

    return { contacts: (data ?? []).map(rowToContactDetail) };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Database connection failed";
    return { contacts: [], error: message };
  }
}

export async function fetchContacts(): Promise<ContactsResult> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchContacts error:", error.message);
      return {
        contacts: [],
        error: humanizeSupabaseFetchError(error.message),
      };
    }

    const contacts = await Promise.all(
      (data ?? []).map(async (row) =>
        enrichContactWithAvatar(rowToContact(row), row)
      )
    );
    return { contacts };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    return { contacts: [], error: message };
  }
}

export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  message: string;
  contactCount?: number;
}> {
  const { contacts, error } = await fetchContacts();

  if (error) {
    if (error.includes("Could not find the table")) {
      return {
        ok: false,
        message:
          "The contacts table is missing. Run supabase/migrations/001_contacts.sql in the Supabase SQL Editor.",
      };
    }
    if (isNotesLogSchemaError(error)) {
      return {
        ok: false,
        message:
          "The notes_log column exists but Supabase has not refreshed its API schema yet. In the SQL Editor run: NOTIFY pgrst, 'reload schema'; then try again.",
      };
    }
    if (isContactTypeSchemaError(error)) {
      return {
        ok: false,
        message:
          "The contact_type column exists but Supabase has not refreshed its API schema yet. In the SQL Editor run: NOTIFY pgrst, 'reload schema'; then try again.",
      };
    }
    return { ok: false, message: error };
  }

  return {
    ok: true,
    message: "Database connected",
    contactCount: contacts.length,
  };
}

function rowToContactDetail(row: ContactRow): ContactDetail {
  const notesLog = resolveRowNotesLog(row);
  const base = rowToContact(row);

  return {
    ...base,
    notes: notesLog.length > 0 ? serializeNotesLog(notesLog) : row.notes ?? undefined,
    notesLog,
    inquiryTranscript: row.inquiry_transcript ?? undefined,
    profile: ensureProfileNameFromContact(row.profile ?? undefined, row.name),
    sourceMetadata: sanitizeSourceMetadata(row.source_metadata),
  };
}

async function resolveRecordingDuration(
  recordingId: string | undefined,
  fallbackMs = 15000
): Promise<number> {
  if (!recordingId) return fallbackMs;
  const { recording } = await getVoiceRecording(recordingId);
  return recording?.duration_ms ?? fallbackMs;
}

async function buildSourceMetadataPatch(input: {
  requestContext: AiRequestContext;
  recordingId?: string;
  transcript: string;
  sourceSnippets: Record<string, string>;
  parsed: ParsedContactFields;
  profileFields: Record<string, string>;
  existingSources: ContactSourceMetadata;
}): Promise<ContactSourceMetadata> {
  const fieldKeys = listPopulatedFieldKeys({
    parsed: input.parsed,
    profileFields: input.profileFields,
  });

  if (fieldKeys.length === 0) return input.existingSources;

  if (input.requestContext.entry_method === "manual") {
    const incoming = buildManualSourcesForFields(
      fieldKeys,
      input.requestContext.current_timestamp
    );
    return mergeContactSourceMetadata(input.existingSources, incoming);
  }

  if (!input.recordingId || Object.keys(input.sourceSnippets).length === 0) {
    return input.existingSources;
  }

  const { recording } = await getVoiceRecording(input.recordingId);
  if (!recording) return input.existingSources;

  const durationMs =
    recording.duration_ms ??
    (await resolveRecordingDuration(input.recordingId));
  const audioUrl = (await resolveRecordingAudioUrl(recording)) ?? "";

  const incoming = buildVoiceSourcesFromSnippets({
    recordingId: input.recordingId,
    storagePath: recording.storage_path,
    audioUrl,
    transcript: input.transcript,
    durationMs,
    sourceSnippets: input.sourceSnippets,
  });

  return mergeContactSourceMetadata(input.existingSources, incoming);
}

function mergeProfileFromVoice(
  existing: ContactProfile,
  profileFields: Partial<Record<string, string>>
): ContactProfile {
  return sanitizeContactProfile({ ...existing, ...profileFields });
}

function buildProfileChangeNote(
  before: ContactProfile,
  after: ContactProfile
): string | null {
  const lines: string[] = [];

  for (const field of getAllProfileFieldsInContext()) {
    const prev = before[field.key]?.trim() ?? "";
    const next = after[field.key]?.trim() ?? "";
    if (prev === next) continue;

    const label = profileFieldExportLabel(field, field.group);
    const format = (value: string) =>
      isContactDateProfileField(field.key)
        ? formatContactDateForDisplay(value)
        : value;

    if (!prev && next) {
      lines.push(`${label}: ${format(next)}`);
    } else if (prev && !next) {
      lines.push(`${label}: cleared`);
    } else {
      lines.push(`${label}: ${format(prev)} → ${format(next)}`);
    }
  }

  if (lines.length === 0) return null;
  return `Profile updated:\n${lines.join("\n")}`;
}

export async function updateContactProfile(
  id: string,
  profile: ContactProfile
): Promise<{ contact: ContactDetail | null; error?: string }> {
  const existing = await getContactRowById(id);
  if (!existing) {
    return { contact: null, error: "Contact not found" };
  }

  const supabase = createServerSupabase();
  const before = sanitizeContactProfile(existing.profile ?? {});
  const cleaned = sanitizeContactProfile(profile);
  const changeContent = buildProfileChangeNote(before, cleaned);
  const notePatch = changeContent
    ? withAppendedNote(existing, changeContent)
    : {
        notes_log: resolveRowNotesLog(existing),
        notes: existing.notes,
      };

  const { data, error } = await updateContactRow(supabase, id, {
    profile: cleaned as never,
    notes: notePatch.notes,
    notes_log: notePatch.notes_log,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("updateContactProfile error:", error.message);
    return { contact: null, error: error.message };
  }

  return { contact: rowToContactDetail(data) };
}

export async function updateContactIdentityFields(
  id: string,
  fields: { name?: string; company?: string }
): Promise<{ contact: ContactDetail | null; error?: string }> {
  const existing = await getContactRowById(id);
  if (!existing) {
    return { contact: null, error: "Contact not found" };
  }

  const updates: ContactWritePayload = {
    updated_at: new Date().toISOString(),
  };

  if (fields.name !== undefined) {
    const trimmed = fields.name.trim();
    if (!trimmed) {
      return { contact: null, error: "Contact name is required." };
    }
    updates.name = trimmed;
  }

  if (fields.company !== undefined) {
    updates.company = fields.company.trim() || null;
  }

  if (Object.keys(updates).length === 1) {
    return { contact: rowToContactDetail(existing) };
  }

  const supabase = createServerSupabase();
  const { data, error } = await updateContactRow(supabase, id, updates);

  if (error) {
    console.error("updateContactIdentityFields error:", error.message);
    return { contact: null, error: error.message };
  }

  return { contact: rowToContactDetail(data) };
}

export async function importContactNotesLog(
  contactId: string,
  imported: ContactNoteEntry[],
  mode: "merge" | "replace" = "merge"
): Promise<{
  contact: ContactDetail | null;
  error?: string;
  importedCount?: number;
}> {
  const existing = await getContactRowById(contactId);
  if (!existing) {
    return { contact: null, error: "Contact not found" };
  }

  if (imported.length === 0) {
    return { contact: null, error: "No valid notes found in import file." };
  }

  const merged = mergeNotesLogImports(
    resolveRowNotesLog(existing),
    imported,
    mode
  );
  const audit = appendNoteEntry(
    merged,
    `Imported ${imported.length} note${imported.length === 1 ? "" : "s"} from file (${mode === "replace" ? "replaced log" : "merged"}).`
  );

  const supabase = createServerSupabase();
  const { data, error } = await updateContactRow(supabase, contactId, {
    notes_log: audit,
    notes: serializeNotesLog(audit),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("importContactNotesLog error:", error.message);
    return { contact: null, error: error.message };
  }

  return {
    contact: rowToContactDetail(data),
    importedCount: imported.length,
  };
}

export async function appendContactNote(
  contactId: string,
  content: string
): Promise<{ contact: ContactDetail | null; error?: string }> {
  const existing = await getContactRowById(contactId);
  if (!existing) {
    return { contact: null, error: "Contact not found" };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { contact: null, error: "Note is required" };
  }

  const notePatch = withAppendedNote(existing, trimmed);
  const supabase = createServerSupabase();
  const { data, error } = await updateContactRow(supabase, contactId, {
    notes_log: notePatch.notes_log,
    notes: notePatch.notes,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("appendContactNote error:", error.message);
    return { contact: null, error: error.message };
  }

  return { contact: rowToContactDetail(data) };
}

export async function updateContactType(
  id: string,
  contactType: ContactType
): Promise<{ contact: ContactDetail | null; error?: string }> {
  const existing = await getContactRowById(id);
  if (!existing) {
    return { contact: null, error: "Contact not found" };
  }

  const previousType = resolveRowContactType(existing).contactType;
  const typeNote =
    previousType === contactType
      ? null
      : previousType
        ? `Contact type changed: ${CONTACT_TYPE_LABELS[previousType]} → ${CONTACT_TYPE_LABELS[contactType]}.`
        : `Contact type set to ${CONTACT_TYPE_LABELS[contactType]}.`;
  const notePatch = typeNote
    ? withAppendedNote(existing, typeNote)
    : {
        notes_log: resolveRowNotesLog(existing),
        notes: existing.notes,
      };

  const supabase = createServerSupabase();
  const result = (await supabase
    .from("contacts")
    .update({
      contact_type: contactType,
      contact_type_needs_confirmation: false,
      notes_log: notePatch.notes_log,
      notes: notePatch.notes,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .select()
    .single()) as { data: ContactRow | null; error: { message: string } | null };

  if (!result.error && result.data) {
    return { contact: rowToContactDetail(result.data) };
  }

  if (
    result.error &&
    (isContactTypeSchemaError(result.error.message) ||
      isSchemaCacheColumnError(result.error.message))
  ) {
    const profile = sanitizeContactProfile({
      ...(existing.profile ?? {}),
      ...buildContactTypeProfileMeta(contactType, false),
    });

    const fallback = (await supabase
      .from("contacts")
      .update({
        profile: profile as never,
        notes_log: notePatch.notes_log,
        notes: notePatch.notes,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", id)
      .select()
      .single()) as { data: ContactRow | null; error: { message: string } | null };

    if (fallback.error || !fallback.data) {
      console.error("updateContactType fallback error:", fallback.error?.message);
      return {
        contact: null,
        error:
          "Contact type could not be saved. Run supabase/migrations/009_contact_type.sql in Supabase, then: NOTIFY pgrst, 'reload schema';",
      };
    }

    return { contact: rowToContactDetail(fallback.data) };
  }

  if (result.error) {
    console.error("updateContactType error:", result.error.message);
    return { contact: null, error: result.error.message };
  }

  return { contact: null, error: "Could not save contact type" };
}

export async function updateContactTrackingPaused(
  id: string,
  isTrackingPaused: boolean
): Promise<{ contact: ContactDetail | null; error?: string }> {
  const existing = await getContactRowById(id);
  if (!existing) {
    return { contact: null, error: "Contact not found" };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("contacts")
    .update({
      is_tracking_paused: isTrackingPaused,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (isSchemaCacheColumnError(error.message)) {
      return {
        contact: null,
        error:
          "Tracking pause could not be saved. Run supabase/migrations/016_notification_preferences.sql, then: NOTIFY pgrst, 'reload schema';",
      };
    }

    console.error("updateContactTrackingPaused error:", error.message);
    return { contact: null, error: error.message };
  }

  if (!data) {
    return { contact: null, error: "Could not save tracking pause." };
  }

  return { contact: rowToContactDetail(data as ContactRow) };
}

export async function fetchContactById(
  id: string
): Promise<{ contact: ContactDetail | null; error?: string }> {
  const trimmedId = id?.trim();
  if (!trimmedId) {
    return { contact: null, error: "Invalid contact id" };
  }

  try {
    return await withTimeout(
      fetchContactByIdInternal(trimmedId),
      10_000,
      "Contact fetch timed out"
    );
  } catch (err) {
    if (err instanceof OperationTimeoutError) {
      console.error("fetchContactById timeout:", trimmedId);
      return { contact: null, error: err.message };
    }

    const message =
      err instanceof Error ? err.message : "Could not load contact";
    console.error("fetchContactById error:", message);
    return { contact: null, error: message };
  }
}

async function fetchContactByIdInternal(
  id: string
): Promise<{ contact: ContactDetail | null; error?: string }> {
  const row = await getContactRowById(id);
  if (!row) {
    return { contact: null, error: "Contact not found" };
  }

  const synced = await ensureContactProfileNamesPersisted(row);
  const contact = await enrichContactWithAvatar(
    rowToContactDetail(synced),
    synced
  );

  return { contact };
}

export async function updateContactAvatar(
  contactId: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ contact: ContactDetail | null; error?: string }> {
  const existing = await getContactRowById(contactId);
  if (!existing) {
    return { contact: null, error: "Contact not found" };
  }

  const uploaded = await uploadContactAvatar({
    contactId,
    buffer,
    mimeType,
  });

  if (!uploaded.storagePath || !uploaded.avatarUrl) {
    return {
      contact: null,
      error: uploaded.error ?? "Could not upload profile photo",
    };
  }

  const notePatch = withAppendedNote(existing, "Profile photo updated.");
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("contacts")
    .update({
      avatar_storage_path: uploaded.storagePath,
      avatar_url: uploaded.avatarUrl,
      notes_log: notePatch.notes_log,
      notes: notePatch.notes,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", contactId)
    .select()
    .single();

  if (error || !data) {
    console.error("updateContactAvatar error:", error?.message);
    return {
      contact: null,
      error: error?.message ?? "Could not save profile photo",
    };
  }

  const contact = await enrichContactWithAvatar(
    rowToContactDetail(data),
    data
  );
  return { contact };
}

export async function removeContactAvatar(
  contactId: string
): Promise<{ contact: ContactDetail | null; error?: string }> {
  const existing = await getContactRowById(contactId);
  if (!existing) {
    return { contact: null, error: "Contact not found" };
  }

  if (existing.avatar_storage_path?.trim()) {
    await deleteContactAvatarFile(existing.avatar_storage_path.trim());
  }

  const notePatch = withAppendedNote(existing, "Profile photo removed.");
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("contacts")
    .update({
      avatar_storage_path: null,
      avatar_url: null,
      notes_log: notePatch.notes_log,
      notes: notePatch.notes,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", contactId)
    .select()
    .single();

  if (error || !data) {
    console.error("removeContactAvatar error:", error?.message);
    return {
      contact: null,
      error: error?.message ?? "Could not remove profile photo",
    };
  }

  const contact = await enrichContactWithAvatar(
    rowToContactDetail(data),
    data
  );
  return { contact };
}

export async function deleteContact(
  contactId: string
): Promise<{ success: boolean; error?: string }> {
  const trimmedId = contactId?.trim();
  if (!trimmedId) {
    return { success: false, error: "Invalid contact id" };
  }

  const existing = await getContactRowById(trimmedId);
  if (!existing) {
    return { success: false, error: "Contact not found" };
  }

  const supabase = createServerSupabase();

  await supabase.from("time_logs").delete().eq("contact_id", trimmedId);
  await supabase
    .from("scheduled_interactions")
    .delete()
    .eq("contact_id", trimmedId);
  await supabase
    .from("maintenance_reminder_log")
    .delete()
    .eq("contact_id", trimmedId);
  await supabase
    .from("voice_recordings")
    .update({ contact_id: null } as never)
    .eq("contact_id", trimmedId);

  if (existing.avatar_storage_path?.trim()) {
    await deleteContactAvatarFile(existing.avatar_storage_path.trim());
  }

  const { data, error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", trimmedId)
    .select("id");

  if (error) {
    console.error("deleteContact error:", error.message);
    return { success: false, error: error.message };
  }

  if (!data?.length) {
    console.error("deleteContact: no row deleted for id", trimmedId);
    return {
      success: false,
      error:
        "Contact could not be deleted. Run supabase/migrations/018_contacts_delete_policy.sql in the Supabase SQL Editor.",
    };
  }

  return { success: true };
}

async function ensureContactProfileNamesPersisted(
  row: ContactRow
): Promise<ContactRow> {
  const profile = ensureProfileNameFromContact(row.profile ?? undefined, row.name);
  const before = sanitizeContactProfile(row.profile ?? undefined);

  const firstAdded = !before.firstName?.trim() && Boolean(profile.firstName?.trim());
  const lastAdded = !before.lastName?.trim() && Boolean(profile.lastName?.trim());
  if (!firstAdded && !lastAdded) return row;

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("contacts")
    .update({
      profile: profile as never,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", row.id)
    .select()
    .single();

  if (error || !data) {
    console.error("ensureContactProfileNamesPersisted error:", error?.message);
    return row;
  }

  return data;
}

export async function getContactRowById(
  id: string
): Promise<ContactRow | null> {
  const trimmedId = id?.trim();
  if (!trimmedId) return null;

  try {
    const supabase = createServerSupabase();
    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase.from("contacts").select("*").eq("id", trimmedId).single()
      ),
      8_000,
      "Database query timed out"
    );

    if (error) {
      console.error("getContactRowById error:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    if (err instanceof OperationTimeoutError) {
      throw err;
    }

    console.error("getContactRowById error:", err);
    return null;
  }
}

export async function updateContactName(
  contactId: string,
  name: string
): Promise<{ contact: Contact | null; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { contact: null, error: "Name is required" };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("contacts")
    .update({
      name: trimmed,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", contactId)
    .select()
    .single();

  if (error) {
    console.error("updateContactName error:", error.message);
    return { contact: null, error: error.message };
  }

  return { contact: rowToContact(data) };
}

export async function updateContactFromVoice(
  contactId: string,
  transcript: string,
  confirmedName?: string,
  recordingId?: string,
  requestContext?: AiRequestContext
): Promise<{ contact: Contact | null; error?: string }> {
  const existing = await getContactRowById(contactId);
  if (!existing) {
    return { contact: null, error: "Contact not found" };
  }

  const supabase = createServerSupabase();
  const ctx =
    requestContext ??
    buildRequestContext(recordingId ? "voice" : "manual");
  const sourced = await parseTranscriptWithSources(transcript, ctx);
  const parsed = sourced.fields;
  const profileFields = applyParsedScalarsToProfile(
    sourced.profile,
    parsed
  );
  const existingSources = sanitizeSourceMetadata(existing.source_metadata);
  const sourceMetadata = await buildSourceMetadataPatch({
    requestContext: ctx,
    recordingId,
    transcript,
    sourceSnippets: sourced.sourceSnippets,
    parsed,
    profileFields,
    existingSources,
  });

  let mergedProfile = mergeProfileFromVoice(
    sanitizeContactProfile(existing.profile ?? {}),
    profileFields
  );
  const resolvedName =
    confirmedName?.trim() ||
    composeContactName(mergedProfile, parsed.name ?? undefined) ||
    existing.name;
  mergedProfile = ensureProfileNameFromContact(mergedProfile, resolvedName);

  const noteContent = buildNoteLogContent(transcript, parsed.notes);
  const notePatch = withAppendedNote(
    existing,
    noteContent,
    resolveRecordedAt(ctx)
  );
  const contactTypeFields = resolveContactTypeFields(
    parsed,
    transcript,
    existing
  );

  const updates = {
    name: resolvedName,
    company:
      parsed.company ?? mergedProfile.companyName ?? existing.company,
    role: parsed.role ?? existing.role,
    status: existing.status,
    ...contactTypeFields,
    notes: notePatch.notes,
    notes_log: notePatch.notes_log,
    last_contact: parsed.last_contact ?? existing.last_contact,
    last_meeting_date: resolveMeetingDate(
      parsed.last_meeting_date,
      existing.last_meeting_date
    ),
    next_steps: parsed.next_steps ?? existing.next_steps,
    topics: mergeTopics(existing.topics, parsed.topics ?? undefined),
    profile: mergedProfile,
    source_metadata: sourceMetadata,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await updateContactRow(supabase, contactId, updates);

  if (error) {
    console.error("updateContactFromVoice error:", error.message);
    return { contact: null, error: error.message };
  }

  if (recordingId) {
    await linkRecordingToContact(recordingId, contactId);
  }

  return { contact: rowToContact(data) };
}

export async function createContactFromVoice(
  transcript: string,
  confirmedName?: string,
  recordingId?: string,
  requestContext?: AiRequestContext
): Promise<{ contact: Contact | null; error?: string }> {
  const supabase = createServerSupabase();
  const ctx =
    requestContext ??
    buildRequestContext(recordingId ? "voice" : "manual");
  const sourced = await parseTranscriptWithSources(transcript, ctx);
  const parsed = sourced.fields;
  if (confirmedName?.trim()) {
    parsed.name = confirmedName.trim();
  }
  const profileFields = applyParsedScalarsToProfile(
    sourced.profile,
    parsed
  );
  const sourceMetadata = await buildSourceMetadataPatch({
    requestContext: ctx,
    recordingId,
    transcript,
    sourceSnippets: sourced.sourceSnippets,
    parsed,
    profileFields,
    existingSources: {},
  });

  const cleanedProfile = ensureProfileNameFromContact(
    sanitizeContactProfile(profileFields),
    composeContactName(profileFields, parsed.name ?? undefined) ||
      parsed.name ||
      "Unknown Contact"
  );

  const noteContent = buildNoteLogContent(transcript, parsed.notes);
  const initialLog = appendNoteEntry(
    [],
    noteContent,
    resolveRecordedAt(ctx)
  );
  const contactTypeFields = resolveContactTypeFields(parsed, transcript);

  const insert = {
    name:
      composeContactName(cleanedProfile, parsed.name ?? undefined) ||
      "Unknown Contact",
    company: parsed.company ?? cleanedProfile.companyName ?? null,
    role: parsed.role,
    status: "warm" as ContactStatus,
    ...contactTypeFields,
    notes: initialLog.length > 0 ? serializeNotesLog(initialLog) : null,
    notes_log: initialLog,
    last_contact: parsed.last_contact,
    last_meeting_date: resolveMeetingDate(parsed.last_meeting_date),
    next_steps: parsed.next_steps,
    topics: parsed.topics,
    profile: cleanedProfile,
    source_metadata: sourceMetadata,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await insertContactRow(supabase, insert);

  if (error) {
    console.error("createContactFromVoice error:", error.message);
    return { contact: null, error: error.message };
  }

  const inserted = data as ContactRow | null;

  if (recordingId && inserted?.id) {
    await linkRecordingToContact(recordingId, inserted.id);
  }

  return { contact: rowToContact(inserted!) };
}

function proposedPersonToParsedFields(
  person: ParsedProposedPerson
): ParsedContactFields {
  return {
    name: composeContactName(person.profile, person.displayName) || person.displayName,
    company: person.company ?? null,
    role: person.role ?? null,
    notes: person.notes ?? null,
    last_contact: person.lastContact ?? null,
    last_meeting_date: resolveMeetingDate(person.lastMeetingDate),
    next_steps: person.nextSteps ?? null,
    topics: person.topics ?? null,
    contact_type: person.contactType ?? null,
    contact_type_needs_confirmation: person.contactTypeNeedsConfirmation ?? false,
  };
}

export async function createContactFromProposed(
  person: ParsedProposedPerson,
  transcript: string,
  recordingId?: string,
  requestContext?: AiRequestContext
): Promise<{ contact: Contact | null; error?: string }> {
  const supabase = createServerSupabase();
  const ctx =
    requestContext ??
    buildRequestContext(recordingId ? "voice" : "manual");
  const parsed = proposedPersonToParsedFields(person);
  const profileFields = applyParsedScalarsToProfile(
    person.profile,
    parsed
  );
  const sourceMetadata = await buildSourceMetadataPatch({
    requestContext: ctx,
    recordingId,
    transcript,
    sourceSnippets: person.sourceSnippets,
    parsed,
    profileFields,
    existingSources: {},
  });

  const cleanedProfile = ensureProfileNameFromContact(
    sanitizeContactProfile(profileFields),
    composeContactName(profileFields, parsed.name ?? undefined) ||
      parsed.name ||
      "Unknown Contact"
  );

  const noteContent = buildNoteLogContent(transcript, parsed.notes);
  const initialLog = appendNoteEntry(
    [],
    noteContent,
    resolveRecordedAt(ctx)
  );
  const contactTypeFields = resolveContactTypeFields(parsed, transcript);

  const insert = {
    name: parsed.name?.trim() || person.displayName,
    company: parsed.company ?? cleanedProfile.companyName ?? null,
    role: parsed.role,
    status: "warm" as ContactStatus,
    ...contactTypeFields,
    notes: initialLog.length > 0 ? serializeNotesLog(initialLog) : null,
    notes_log: initialLog,
    last_contact: parsed.last_contact ?? (ctx.entry_method === "manual" ? "Added from notes" : null),
    last_meeting_date: resolveMeetingDate(parsed.last_meeting_date),
    next_steps: parsed.next_steps,
    topics: parsed.topics,
    profile: cleanedProfile,
    source_metadata: sourceMetadata,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await insertContactRow(supabase, insert);

  if (error) {
    console.error("createContactFromProposed error:", error.message);
    return { contact: null, error: error.message };
  }

  const inserted = data as ContactRow | null;

  if (recordingId && inserted?.id) {
    await linkRecordingToContact(recordingId, inserted.id);
  }

  return { contact: rowToContact(inserted!) };
}

export async function updateContactFromProposed(
  contactId: string,
  person: ParsedProposedPerson,
  transcript: string,
  recordingId?: string,
  requestContext?: AiRequestContext
): Promise<{ contact: Contact | null; error?: string }> {
  const existing = await getContactRowById(contactId);
  if (!existing) {
    return { contact: null, error: "Contact not found" };
  }

  const supabase = createServerSupabase();
  const ctx =
    requestContext ??
    buildRequestContext(recordingId ? "voice" : "manual");
  const parsed = proposedPersonToParsedFields(person);
  const profileFields = applyParsedScalarsToProfile(person.profile, parsed);
  const existingSources = sanitizeSourceMetadata(existing.source_metadata);
  const sourceMetadata = await buildSourceMetadataPatch({
    requestContext: ctx,
    recordingId,
    transcript,
    sourceSnippets: person.sourceSnippets,
    parsed,
    profileFields,
    existingSources,
  });

  let mergedProfile = mergeProfileFromVoice(
    sanitizeContactProfile(existing.profile ?? {}),
    profileFields
  );
  const resolvedName =
    composeContactName(mergedProfile, parsed.name ?? undefined) || existing.name;
  mergedProfile = ensureProfileNameFromContact(mergedProfile, resolvedName);

  const noteContent = buildNoteLogContent(transcript, parsed.notes);
  const notePatch = withAppendedNote(
    existing,
    noteContent,
    resolveRecordedAt(ctx)
  );
  const contactTypeFields = resolveContactTypeFields(
    parsed,
    transcript,
    existing
  );

  const updates = {
    name: resolvedName,
    company: parsed.company ?? mergedProfile.companyName ?? existing.company,
    role: parsed.role ?? existing.role,
    status: existing.status,
    ...contactTypeFields,
    notes: notePatch.notes,
    notes_log: notePatch.notes_log,
    last_contact: parsed.last_contact ?? existing.last_contact,
    last_meeting_date: resolveMeetingDate(
      parsed.last_meeting_date,
      existing.last_meeting_date
    ),
    next_steps: parsed.next_steps ?? existing.next_steps,
    topics: mergeTopics(existing.topics, parsed.topics ?? undefined),
    profile: mergedProfile,
    source_metadata: sourceMetadata,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await updateContactRow(supabase, contactId, updates);

  if (error) {
    console.error("updateContactFromProposed error:", error.message);
    return { contact: null, error: error.message };
  }

  if (recordingId) {
    await linkRecordingToContact(recordingId, contactId);
  }

  return { contact: rowToContact(data) };
}

export type ManualContactInput = {
  name: string;
  company?: string;
  role?: string;
  lastContact?: string;
  notes?: string;
  nextSteps?: string;
  topics?: string[];
  profile?: ContactProfile;
  contactType?: ContactType | null;
  contactTypeNeedsConfirmation?: boolean;
};

export async function createContactManual(
  input: ManualContactInput
): Promise<{ contact: ContactDetail | null; error?: string }> {
  const supabase = createServerSupabase();
  const hasContactType =
    input.contactType && isContactType(input.contactType);
  const contactTypeNeedsConfirmation = hasContactType
    ? false
    : Boolean(input.contactTypeNeedsConfirmation ?? !hasContactType);

  const profile = ensureProfileNameFromContact(
    sanitizeContactProfile({
      ...applyParsedScalarsToProfile(input.profile ?? {}, {
        name: input.name,
        company: input.company ?? null,
      }),
      ...buildContactTypeProfileMeta(
        hasContactType ? input.contactType! : null,
        contactTypeNeedsConfirmation
      ),
    }),
    input.name
  );
  const name =
    composeContactName(profile, input.name) || input.name.trim();
  if (!name) {
    return { contact: null, error: "Name is required" };
  }

  const manualNote = input.notes?.trim() || "Contact added manually.";
  const initialLog = appendNoteEntry([], manualNote, new Date().toISOString());

  const insert = {
    name,
    company: input.company?.trim() || profile.companyName?.trim() || null,
    role: input.role?.trim() || null,
    status: "warm" as ContactStatus,
    contact_type: hasContactType ? input.contactType! : null,
    contact_type_needs_confirmation: contactTypeNeedsConfirmation,
    notes: serializeNotesLog(initialLog),
    notes_log: initialLog,
    last_contact: input.lastContact?.trim() || "Added manually",
    next_steps: input.nextSteps?.trim() || null,
    topics: input.topics?.length ? input.topics : null,
    profile,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await insertContactRow(supabase, insert);

  if (error) {
    console.error("createContactManual error:", error.message);
    return { contact: null, error: error.message };
  }

  return { contact: rowToContactDetail(data) };
}

function buildImportNotes(data: PhoneContactImport): string | null {
  const lines = [
    data.phone ? `Phone: ${data.phone}` : null,
    data.email ? `Email: ${data.email}` : null,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : null;
}

export type PhoneContactSyncResult = {
  added: number;
  merged: number;
  skipped: number;
  summary: string;
  error?: string;
};

function matchesPendingPhoneImport(
  candidate: PhoneContactImport,
  queued: PhoneContactImport
): boolean {
  const candidateEmail = candidate.email?.trim();
  const queuedEmail = queued.email?.trim();
  if (candidateEmail && queuedEmail) {
    const left = normalizeSyncEmail(candidateEmail);
    const right = normalizeSyncEmail(queuedEmail);
    if (left && right && left === right) return true;
  }

  const candidatePhone = candidate.phone?.trim();
  const queuedPhone = queued.phone?.trim();
  if (candidatePhone && queuedPhone) {
    const left = normalizeSyncPhone(candidatePhone);
    const right = normalizeSyncPhone(queuedPhone);
    if (left && right && left === right) return true;
  }

  if (!candidateEmail && !candidatePhone && !queuedEmail && !queuedPhone) {
    return (
      candidate.name.trim().toLowerCase() === queued.name.trim().toLowerCase()
    );
  }

  return false;
}

export async function syncPhoneContacts(
  imports: PhoneContactImport[]
): Promise<PhoneContactSyncResult> {
  const emptyResult = (overrides?: Partial<PhoneContactSyncResult>) => ({
    added: 0,
    merged: 0,
    skipped: 0,
    summary: buildContactSyncSummary(0, 0, 0),
    ...overrides,
  });

  if (imports.length === 0) {
    return emptyResult();
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("syncPhoneContacts fetch error:", error.message);
    return emptyResult({
      error: humanizeSupabaseFetchError(error.message),
    });
  }

  const existingRows: ContactSyncExistingRow[] = ((data as ContactRow[] | null) ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    company: row.company,
    role: row.role,
    topics: row.topics,
    profile: row.profile,
  }));

  const matchIndex = buildContactSyncMatchIndex(existingRows);
  const rowsById = new Map(existingRows.map((row) => [row.id, row]));

  let added = 0;
  let merged = 0;
  let skipped = 0;
  const toInsert: PhoneContactImport[] = [];

  for (const importContact of imports) {
    const name = importContact.name.trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    const normalizedImport = { ...importContact, name };
    const matched = findContactSyncMatch(normalizedImport, matchIndex);

    if (matched) {
      const currentRow = rowsById.get(matched.id) ?? matched;
      const updates = mergePhoneImportIntoExisting(currentRow, normalizedImport);

      if (!updates) {
        skipped += 1;
        continue;
      }

      const { error: updateError } = await updateContactRow(
        supabase,
        currentRow.id,
        updates
      );

      if (updateError) {
        console.error("syncPhoneContacts merge error:", updateError.message);
        return emptyResult({
          added,
          merged,
          skipped,
          error: updateError.message,
        });
      }

      const mergedRow: ContactSyncExistingRow = {
        ...currentRow,
        company: updates.company ?? currentRow.company,
        role: updates.role ?? currentRow.role,
        topics: updates.topics ?? currentRow.topics,
        profile: updates.profile ?? currentRow.profile,
      };
      rowsById.set(currentRow.id, mergedRow);
      registerRowInSyncIndex(matchIndex, mergedRow);
      merged += 1;
      continue;
    }

    const duplicatePending = toInsert.some((queued) =>
      matchesPendingPhoneImport(normalizedImport, queued)
    );
    if (duplicatePending) {
      skipped += 1;
      continue;
    }

    toInsert.push(normalizedImport);
  }

  if (toInsert.length > 0) {
    const rows = toInsert.map((item) => {
      const importContent =
        buildImportNotes(item) ??
        `Imported from device contacts: ${item.name.trim()}`;
      const initialLog = appendNoteEntry(
        [],
        importContent,
        new Date().toISOString()
      );
      const profile = buildPhoneImportProfile(item);

      return {
        name: item.name.trim(),
        company:
          item.company?.trim() || profile.companyName?.trim() || null,
        role: item.role?.trim() || null,
        status: "warm" as ContactStatus,
        contact_type: null,
        contact_type_needs_confirmation: true,
        notes: serializeNotesLog(initialLog),
        notes_log: initialLog,
        profile,
        last_contact: "Imported from phone",
        updated_at: new Date().toISOString(),
      };
    });

    const { error: insertError } = await insertContactRows(supabase, rows);

    if (insertError) {
      console.error("syncPhoneContacts error:", insertError.message);
      return emptyResult({
        added,
        merged,
        skipped,
        error: insertError.message,
      });
    }

    added = toInsert.length;
  }

  return {
    added,
    merged,
    skipped,
    summary: buildContactSyncSummary(added, merged, skipped),
  };
}

/** @deprecated Use agent tools instead */
export async function saveParsedContact(
  _parsed: ParsedContactFields,
  transcript: string,
  recordingId?: string
): Promise<{ contact: Contact | null; error?: string }> {
  return createContactFromVoice(transcript, undefined, recordingId);
}
