import type { ContactProfileFieldKey } from "@/types/contact-profile";

/** Canonical calendar date format used across KinSight (storage, display, AI). */
export const CONTACT_DATE_FORMAT = "MM-DD-YYYY";
export const CONTACT_DATE_PLACEHOLDER = "MM-DD-YYYY";
export const CONTACT_DATE_HINT = "Use MM-DD-YYYY (example: 03-15-1972).";
export const CONTACT_DATE_EXAMPLE = "03-15-1972";

/** Profile fields stored as calendar dates in MM-DD-YYYY. */
export const CONTACT_DATE_PROFILE_FIELDS = [
  "birthDate",
  "weddingAnniversary",
] as const satisfies readonly ContactProfileFieldKey[];

export type ContactDateProfileField = (typeof CONTACT_DATE_PROFILE_FIELDS)[number];

export function isContactDateProfileField(
  key: string
): key is ContactDateProfileField {
  return (CONTACT_DATE_PROFILE_FIELDS as readonly string[]).includes(key);
}

export function isAppDateString(value: string): boolean {
  return /^\d{2}-\d{2}-\d{4}$/.test(value.trim());
}

function isIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function toAppDate(month: number, day: number, year: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${mm}-${dd}-${year}`;
}

function parseAppDate(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  return toAppDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function parseIsoToApp(value: string): string | null {
  if (!isIsoDateString(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return toAppDate(month, day, year);
}

function parseUsSlashDate(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  let year = Number(match[3]);
  if (year < 100) year += year >= 50 ? 1900 : 2000;
  return toAppDate(Number(match[1]), Number(match[2]), year);
}

/** Normalize user, legacy, or AI input to MM-DD-YYYY when parseable. */
export function normalizeContactDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const app = parseAppDate(trimmed);
  if (app) return app;

  const iso = parseIsoToApp(trimmed);
  if (iso) return iso;

  const slash = parseUsSlashDate(trimmed);
  if (slash) return slash;

  // Incomplete numeric fragments (e.g. "0", "03", "03-1") must not be guessed via Date.parse.
  if (/^[\d./\s-]+$/.test(trimmed)) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  return toAppDate(
    parsed.getMonth() + 1,
    parsed.getDate(),
    parsed.getFullYear()
  );
}

/** Format a stored or raw date for display (MM-DD-YYYY). */
export function formatContactDateForDisplay(value: string): string {
  return normalizeContactDate(value) ?? value.trim();
}

/** Value shown in date text inputs — preserves partial entry while typing. */
export function contactDateInputValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (isAppDateString(trimmed)) return trimmed;

  const normalized = normalizeContactDate(trimmed);
  if (normalized) return normalized;

  return trimmed;
}

export function normalizeProfileDateFields<
  T extends Partial<Record<ContactProfileFieldKey, string>>,
>(profile: T): T {
  const result = { ...profile };
  for (const key of CONTACT_DATE_PROFILE_FIELDS) {
    const raw = result[key];
    if (!raw?.trim()) continue;
    const normalized = normalizeContactDate(raw);
    if (normalized) {
      result[key] = normalized;
    }
  }
  return result;
}

export function normalizeMeetingDate(
  value: string | null | undefined
): string | null {
  if (!value?.trim()) return null;
  return normalizeContactDate(value);
}

export function formatLastMeetingDateForDisplay(
  lastMeetingDate?: string | null,
  lastContact?: string | null
): string {
  if (lastMeetingDate?.trim()) {
    const normalized = normalizeContactDate(lastMeetingDate);
    if (normalized) return normalized;
    return lastMeetingDate.trim();
  }
  if (lastContact?.trim()) return lastContact.trim();
  return "Unknown";
}
