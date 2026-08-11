import type { PhoneContactImport } from "@/lib/contacts/phone-contacts";
import type { ContactProfile } from "@/types/contact-profile";
import {
  applyParsedScalarsToProfile,
  ensureProfileNameFromContact,
  sanitizeContactProfile,
} from "@/types/contact-profile";

const PROFILE_EMAIL_KEYS = [
  "businessEmail",
  "personalEmail",
  "otherEmail",
] as const;

const PROFILE_PHONE_KEYS = [
  "businessPhone",
  "mobilePhone",
  "homePhone",
  "otherPhone",
] as const;

export type ContactSyncExistingRow = {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  topics: string[] | null;
  profile?: ContactProfile | null;
};

export type ContactSyncMergeUpdates = {
  company?: string | null;
  role?: string | null;
  topics?: string[] | null;
  profile?: ContactProfile;
  updated_at: string;
};

export type ContactSyncMatchIndex = {
  byEmail: Map<string, string>;
  byPhone: Map<string, string>;
  byName: Map<string, string>;
  rowsById: Map<string, ContactSyncExistingRow>;
};

export function normalizeSyncEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeSyncPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function normalizeSyncName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function collectNormalizedEmails(profile: ContactProfile | null | undefined): Set<string> {
  const seen = new Set<string>();
  if (!profile) return seen;

  for (const key of PROFILE_EMAIL_KEYS) {
    const normalized = normalizeSyncEmail(profile[key] ?? "");
    if (normalized) seen.add(normalized);
  }

  return seen;
}

function collectNormalizedPhones(profile: ContactProfile | null | undefined): Set<string> {
  const seen = new Set<string>();
  if (!profile) return seen;

  for (const key of PROFILE_PHONE_KEYS) {
    const normalized = normalizeSyncPhone(profile[key] ?? "");
    if (normalized) seen.add(normalized);
  }

  return seen;
}

function assignEmailToProfile(
  profile: ContactProfile,
  email: string
): ContactProfile | null {
  const trimmed = email.trim();
  const normalized = normalizeSyncEmail(trimmed);
  if (!normalized) return null;

  const existing = collectNormalizedEmails(profile);
  if (existing.has(normalized)) return null;

  for (const key of PROFILE_EMAIL_KEYS) {
    if (!hasText(profile[key])) {
      return sanitizeContactProfile({ ...profile, [key]: trimmed });
    }
  }

  return null;
}

function assignPhoneToProfile(
  profile: ContactProfile,
  phone: string
): ContactProfile | null {
  const trimmed = phone.trim();
  const normalized = normalizeSyncPhone(trimmed);
  if (!normalized) return null;

  const existing = collectNormalizedPhones(profile);
  if (existing.has(normalized)) return null;

  for (const key of PROFILE_PHONE_KEYS) {
    if (!hasText(profile[key])) {
      return sanitizeContactProfile({ ...profile, [key]: trimmed });
    }
  }

  return null;
}

export function unionStringArrays(
  existing: string[] | null | undefined,
  incoming: string[] | null | undefined
): string[] | null {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const value of [...(existing ?? []), ...(incoming ?? [])]) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(trimmed);
  }

  return merged.length > 0 ? merged : null;
}

export function registerRowInSyncIndex(
  index: ContactSyncMatchIndex,
  row: ContactSyncExistingRow
): void {
  index.rowsById.set(row.id, row);

  const normalizedName = normalizeSyncName(row.name);
  if (normalizedName && !index.byName.has(normalizedName)) {
    index.byName.set(normalizedName, row.id);
  }

  for (const email of collectNormalizedEmails(row.profile ?? undefined)) {
    if (!index.byEmail.has(email)) index.byEmail.set(email, row.id);
  }

  for (const phone of collectNormalizedPhones(row.profile ?? undefined)) {
    if (!index.byPhone.has(phone)) index.byPhone.set(phone, row.id);
  }
}

export function buildContactSyncMatchIndex(
  rows: ContactSyncExistingRow[]
): ContactSyncMatchIndex {
  const byEmail = new Map<string, string>();
  const byPhone = new Map<string, string>();
  const byName = new Map<string, string>();
  const rowsById = new Map<string, ContactSyncExistingRow>();
  const index: ContactSyncMatchIndex = {
    byEmail,
    byPhone,
    byName,
    rowsById,
  };

  for (const row of rows) {
    registerRowInSyncIndex(index, row);
  }

  return index;
}

export function findContactSyncMatch(
  importContact: PhoneContactImport,
  index: ContactSyncMatchIndex
): ContactSyncExistingRow | null {
  const importEmail = importContact.email?.trim();
  if (importEmail) {
    const normalized = normalizeSyncEmail(importEmail);
    const id = normalized ? index.byEmail.get(normalized) : undefined;
    if (id) return index.rowsById.get(id) ?? null;
  }

  const importPhone = importContact.phone?.trim();
  if (importPhone) {
    const normalized = normalizeSyncPhone(importPhone);
    const id = normalized ? index.byPhone.get(normalized) : undefined;
    if (id) return index.rowsById.get(id) ?? null;
  }

  if (!importEmail && !importPhone) {
    const normalizedName = normalizeSyncName(importContact.name);
    const id = normalizedName ? index.byName.get(normalizedName) : undefined;
    if (id) return index.rowsById.get(id) ?? null;
  }

  return null;
}

function profilesEqual(a: ContactProfile, b: ContactProfile): boolean {
  const left = sanitizeContactProfile(a);
  const right = sanitizeContactProfile(b);
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    const leftValue = left[key as keyof ContactProfile] ?? "";
    const rightValue = right[key as keyof ContactProfile] ?? "";
    if (leftValue !== rightValue) return false;
  }

  return true;
}

export function mergePhoneImportIntoExisting(
  existing: ContactSyncExistingRow,
  importContact: PhoneContactImport
): ContactSyncMergeUpdates | null {
  const companyIncoming = importContact.company?.trim() || null;
  const roleIncoming = importContact.role?.trim() || null;

  const company = hasText(existing.company)
    ? existing.company!.trim()
    : companyIncoming;
  const role = hasText(existing.role) ? existing.role!.trim() : roleIncoming;

  let profile = sanitizeContactProfile(
    ensureProfileNameFromContact(existing.profile ?? undefined, existing.name)
  );

  profile = sanitizeContactProfile(
    applyParsedScalarsToProfile(profile, {
      name: importContact.name,
      company: companyIncoming,
    })
  );

  if (importContact.email?.trim()) {
    const withEmail = assignEmailToProfile(profile, importContact.email);
    if (withEmail) profile = withEmail;
  }

  if (importContact.phone?.trim()) {
    const withPhone = assignPhoneToProfile(profile, importContact.phone);
    if (withPhone) profile = withPhone;
  }

  if (
    companyIncoming &&
    !hasText(existing.profile?.companyName) &&
    !hasText(profile.companyName)
  ) {
    profile = sanitizeContactProfile({
      ...profile,
      companyName: companyIncoming,
    });
  }

  const topics = unionStringArrays(existing.topics, null);
  const existingProfile = sanitizeContactProfile(existing.profile ?? undefined);

  const companyChanged = (existing.company?.trim() || null) !== (company || null);
  const roleChanged = (existing.role?.trim() || null) !== (role || null);
  const topicsChanged =
    JSON.stringify(existing.topics ?? []) !== JSON.stringify(topics ?? []);
  const profileChanged = !profilesEqual(existingProfile, profile);

  if (!companyChanged && !roleChanged && !topicsChanged && !profileChanged) {
    return null;
  }

  return {
    company: company || null,
    role: role || null,
    topics,
    profile,
    updated_at: new Date().toISOString(),
  };
}

export function buildPhoneImportProfile(
  importContact: PhoneContactImport
): ContactProfile {
  let profile = sanitizeContactProfile(
    applyParsedScalarsToProfile({}, {
      name: importContact.name,
      company: importContact.company ?? null,
    })
  );

  if (importContact.email?.trim()) {
    profile = sanitizeContactProfile({
      ...profile,
      businessEmail: importContact.email.trim(),
    });
  }

  if (importContact.phone?.trim()) {
    profile = sanitizeContactProfile({
      ...profile,
      mobilePhone: importContact.phone.trim(),
    });
  }

  return ensureProfileNameFromContact(profile, importContact.name.trim());
}

export function buildContactSyncSummary(
  created: number,
  merged: number,
  skipped: number
): string {
  const parts: string[] = [];

  if (created > 0) {
    parts.push(
      `Created ${created} new contact${created === 1 ? "" : "s"}`
    );
  }

  if (merged > 0) {
    parts.push(
      `Merged/enriched ${merged} existing contact${merged === 1 ? "" : "s"} with no data loss`
    );
  }

  if (skipped > 0) {
    parts.push(
      `${skipped} contact${skipped === 1 ? "" : "s"} already up to date`
    );
  }

  if (parts.length === 0) {
    return "Sync complete — no changes.";
  }

  return `${parts.join(", ")}.`;
}
