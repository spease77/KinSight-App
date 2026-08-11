import type { ParsedProposedPerson } from "@/lib/ai/parse-multi-contact";
import {
  formatContactDateForDisplay,
  isContactDateProfileField,
} from "@/lib/dates/contact-dates";
import { CONTACT_TYPE_LABELS } from "@/lib/contacts/contact-type";
import { getProfileFieldLabel } from "@/types/contact-profile";
export type ProposedContactSummaryLine = {
  label: string;
  value: string;
};

export function summarizeProposedContact(
  person: ParsedProposedPerson
): ProposedContactSummaryLine[] {
  const lines: ProposedContactSummaryLine[] = [];

  const add = (label: string, value?: string) => {
    if (value?.trim()) lines.push({ label, value: value.trim() });
  };

  add("First Name", person.firstName);
  add("Last Name", person.lastName);
  add("Prefers To Be Called", person.nickname);
  add("Company", person.company);
  add("Role", person.role);
  if (person.contactType) {
    add("Contact Type", CONTACT_TYPE_LABELS[person.contactType]);
  } else if (person.contactTypeNeedsConfirmation) {
    add("Contact Type", "Needs confirmation");
  }
  add("Notes", person.notes);
  add("Last Contact", person.lastContact);
  add("Last Meeting", person.lastMeetingDate ? formatContactDateForDisplay(person.lastMeetingDate) : undefined);
  add("Next Steps", person.nextSteps);
  if (person.topics?.length) {
    add("Topics", person.topics.join(", "));
  }
  if (person.relationshipHint) {
    add("Relationship", person.relationshipHint);
  }

  if (lines.length === 0 && person.displayName.trim()) {
    add("Name", person.displayName);
  }

  for (const [key, value] of Object.entries(person.profile)) {
    if (!value?.trim()) continue;
    if (
      key === "firstName" ||
      key === "lastName" ||
      key === "nickname" ||
      key === "companyName"
    ) {
      continue;
    }
    add(getProfileFieldLabel(key as never), isContactDateProfileField(key) ? formatContactDateForDisplay(value) : value);
  }

  return lines;
}
