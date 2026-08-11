import { formatContactDateForDisplay, isContactDateProfileField } from "@/lib/dates/contact-dates";
import { CONTACT_TYPE_LABELS } from "@/lib/contacts/contact-type";
import { buildNotesLogKnowledgeLines } from "@/lib/contacts/notes-log";
import type { ContactDetail } from "@/types/contact";
import {
  CONTACT_PROFILE_SECTIONS,
  splitFullName,
} from "@/types/contact-profile";

const MAX_NOTES_CHARS = 400;
const MAX_TRANSCRIPT_CHARS = 500;
const MAX_PROFILE_FIELDS = 24;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function buildContactKnowledgeSummary(contact: ContactDetail): string {
  const lines: string[] = [];
  const profile = contact.profile ?? {};
  const { firstName, lastName } = splitFullName(contact.name);

  lines.push(
    `[id: ${contact.id}] ${contact.name} — ${contact.role || "Unknown role"} at ${contact.company || "Unknown company"}`
  );
  lines.push(
    `  Identity: first="${profile.firstName?.trim() || firstName}" last="${profile.lastName?.trim() || lastName}" company="${contact.company || profile.companyName || ""}"`
  );

  if (contact.contactType) {
    lines.push(`  Contact type: ${CONTACT_TYPE_LABELS[contact.contactType]}`);
  } else if (contact.contactTypeNeedsConfirmation) {
    lines.push("  Contact type: needs confirmation");
  }

  if (contact.lastMeetingDate?.trim()) {
    lines.push(
      `  Last meeting: ${formatContactDateForDisplay(contact.lastMeetingDate)}`
    );
  } else if (contact.lastContact?.trim()) {
    lines.push(`  Last contact: ${contact.lastContact.trim()}`);
  }

  if ((contact.notesLog?.length ?? 0) > 0) {
    lines.push(...buildNotesLogKnowledgeLines(contact.notesLog));
  } else if (contact.notes?.trim()) {
    lines.push(`  Notes: ${truncate(contact.notes, MAX_NOTES_CHARS)}`);
  } else if (contact.inquiryTranscript?.trim()) {
    lines.push(
      `  Notes: ${truncate(contact.inquiryTranscript, MAX_TRANSCRIPT_CHARS)}`
    );
  }
  if (contact.nextSteps?.trim()) {
    lines.push(`  Next steps: ${contact.nextSteps.trim()}`);
  }
  if (contact.topics?.length) {
    lines.push(`  Topics: ${contact.topics.join(", ")}`);
  }

  let profileLines = 0;
  for (const section of CONTACT_PROFILE_SECTIONS) {
    for (const group of section.groups) {
      for (const field of group.fields) {
        const value = profile[field.key]?.trim();
        if (!value || profileLines >= MAX_PROFILE_FIELDS) continue;

        const label =
          group.fields.length === 1
            ? group.title
            : `${group.title} — ${field.label}`;
        const display = isContactDateProfileField(field.key)
          ? formatContactDateForDisplay(value)
          : value;
        lines.push(`  ${label}: ${display}`);
        profileLines += 1;
      }
    }
  }

  return lines.join("\n");
}

export function buildContactsKnowledgeBlock(contacts: ContactDetail[]): string {
  if (contacts.length === 0) {
    return "No contacts saved yet.";
  }

  return contacts.map(buildContactKnowledgeSummary).join("\n\n");
}

export function getContactIdentityForConfirmation(contact: ContactDetail): {
  firstName: string;
  lastName: string;
  company: string;
} {
  const profile = contact.profile ?? {};
  const fromName = splitFullName(contact.name);

  return {
    firstName: profile.firstName?.trim() || fromName.firstName,
    lastName: profile.lastName?.trim() || fromName.lastName,
    company: contact.company?.trim() || profile.companyName?.trim() || "",
  };
}

export function getProposedPersonIdentity(person: {
  displayName: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  profile: Partial<Record<string, string>>;
}): { firstName: string; lastName: string; company: string } {
  const fromName = splitFullName(person.displayName);

  return {
    firstName: person.firstName?.trim() || person.profile.firstName?.trim() || fromName.firstName,
    lastName: person.lastName?.trim() || person.profile.lastName?.trim() || fromName.lastName,
    company:
      person.company?.trim() ||
      person.profile.companyName?.trim() ||
      "",
  };
}
