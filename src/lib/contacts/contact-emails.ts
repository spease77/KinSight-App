import { isValidContactEmail } from "@/lib/calendar/calendar-attendees";
import type { ContactProfile } from "@/types/contact-profile";

export type ContactEmailOption = {
  key: string;
  label: string;
  email: string;
};

const PROFILE_EMAIL_FIELDS = [
  { key: "businessEmail", label: "Work" },
  { key: "personalEmail", label: "Personal" },
  { key: "otherEmail", label: "Other" },
] as const;

export function getContactEmailOptions(
  profile: ContactProfile | undefined
): ContactEmailOption[] {
  if (!profile) return [];

  const seen = new Set<string>();
  const options: ContactEmailOption[] = [];

  for (const field of PROFILE_EMAIL_FIELDS) {
    const email = profile[field.key]?.trim();
    if (!email || !isValidContactEmail(email)) continue;

    const normalized = email.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    options.push({
      key: field.key,
      label: field.label,
      email,
    });
  }

  return options;
}

export function buildMailtoHref(email: string): string {
  return `mailto:${email.trim()}`;
}

export function resolveInitialSelectedEmails(
  options: ContactEmailOption[]
): string[] {
  if (options.length === 1) return [options[0].email];
  return [];
}

export function toggleSelectedEmail(
  selectedEmails: string[],
  email: string
): string[] {
  const normalized = email.trim().toLowerCase();
  const exists = selectedEmails.some(
    (value) => value.trim().toLowerCase() === normalized
  );
  if (exists) {
    return selectedEmails.filter(
      (value) => value.trim().toLowerCase() !== normalized
    );
  }
  return [...selectedEmails, email.trim()];
}

export function addCustomInviteEmail(
  selectedEmails: string[],
  email: string
): string[] {
  const trimmed = email.trim();
  if (!trimmed || !isValidContactEmail(trimmed)) return selectedEmails;

  const normalized = trimmed.toLowerCase();
  if (
    selectedEmails.some((value) => value.trim().toLowerCase() === normalized)
  ) {
    return selectedEmails;
  }

  return [...selectedEmails, trimmed];
}
