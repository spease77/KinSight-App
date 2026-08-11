import type { ContactProfile } from "@/types/contact-profile";
import {
  formatStoredPhoneDisplay,
  sanitizePhoneDigits,
} from "@/lib/contacts/phone-input";

export { sanitizePhoneDigits } from "@/lib/contacts/phone-input";

const PROFILE_PHONE_FIELDS = [
  { key: "mobilePhone", label: "Mobile" },
  { key: "businessPhone", label: "Work" },
  { key: "homePhone", label: "Home" },
  { key: "otherPhone", label: "Other" },
] as const;

export type ContactPhoneOption = {
  key: string;
  label: string;
  phone: string;
  e164: string;
  display: string;
};

export function getContactPhoneOptions(
  profile: ContactProfile | null | undefined
): ContactPhoneOption[] {
  if (!profile) return [];

  const seen = new Set<string>();
  const options: ContactPhoneOption[] = [];

  for (const field of PROFILE_PHONE_FIELDS) {
    const phone = profile[field.key]?.trim();
    if (!phone) continue;

    const e164 = formatPhoneToE164(phone);
    if (!e164) continue;

    const normalized = sanitizePhoneDigits(e164);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    options.push({
      key: field.key,
      label: field.label,
      phone,
      e164,
      display: formatPhoneDisplay(e164),
    });
  }

  return options;
}

const PROFILE_PHONE_KEYS = PROFILE_PHONE_FIELDS.map((field) => field.key);

const DEFAULT_COUNTRY_CODE = "1";

/**
 * Normalize a phone string to E.164 (default US +1 when no country code is present).
 */
export function formatPhoneToE164(
  phone: string,
  defaultCountryCode = DEFAULT_COUNTRY_CODE
): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("+")) {
    const digits = sanitizePhoneDigits(trimmed);
    if (digits.length < 10) return null;
    return `+${digits}`;
  }

  const digits = sanitizePhoneDigits(trimmed);
  if (!digits) return null;

  if (digits.length === 10) {
    return `+${defaultCountryCode}${digits}`;
  }

  if (digits.length === 11 && digits.startsWith(defaultCountryCode)) {
    return `+${digits}`;
  }

  if (digits.length > 11) {
    return `+${digits}`;
  }

  if (digits.length >= 10) {
    return `+${defaultCountryCode}${digits.slice(-10)}`;
  }

  return null;
}

export function resolvePrimaryContactPhone(
  profile: ContactProfile | null | undefined
): string | null {
  if (!profile) return null;

  for (const key of PROFILE_PHONE_KEYS) {
    const value = profile[key]?.trim();
    if (value) return value;
  }

  return null;
}

export function resolveContactPhoneE164(
  profile: ContactProfile | null | undefined
): string | null {
  const raw = resolvePrimaryContactPhone(profile);
  if (!raw) return null;
  return formatPhoneToE164(raw);
}

export function buildTelHref(e164: string): string {
  return `tel:${e164}`;
}

export function buildSmsHref(e164: string): string {
  return `sms:${e164}`;
}

export function buildFacetimeHref(e164: string): string {
  return `facetime:${e164}`;
}

export function formatPhoneDisplay(e164: string): string {
  return formatStoredPhoneDisplay(e164);
}
