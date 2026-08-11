import { parseMultiContactNote } from "@/lib/ai/parse-multi-contact";
import type { ParsedProposedPerson } from "@/lib/ai/parse-multi-contact";
import type { AiRequestContext } from "@/lib/ai/request-context";
import { findExistingContactByName } from "@/lib/contacts/match-existing";
import { summarizeProposedContact } from "@/lib/contacts/proposed-contact-summary";
import { fetchContacts } from "@/lib/supabase/contacts";

export type ProposedContactForReview = {
  tempId: string;
  person: ParsedProposedPerson;
  summary: ReturnType<typeof summarizeProposedContact>;
};

export type ExistingContactUpdate = {
  contactId: string;
  contactName: string;
  existingCompany: string;
  person: ParsedProposedPerson;
  summary: ReturnType<typeof summarizeProposedContact>;
};

export type DetectContactsResult = {
  newContacts: ProposedContactForReview[];
  existingUpdates: ExistingContactUpdate[];
};

export async function detectContactsFromNote(
  transcript: string,
  requestContext: AiRequestContext
): Promise<DetectContactsResult> {
  const [{ contacts }, people] = await Promise.all([
    fetchContacts(),
    parseMultiContactNote(transcript, requestContext),
  ]);

  const newContacts: ProposedContactForReview[] = [];
  const existingUpdates: ExistingContactUpdate[] = [];

  people.forEach((person, index) => {
    const existing = findExistingContactByName(person.displayName, contacts);
    if (!person.displayName.trim()) return;
    const summary = summarizeProposedContact(person);

    if (existing) {
      existingUpdates.push({
        contactId: existing.id,
        contactName: existing.name,
        existingCompany: existing.company,
        person,
        summary,
      });
      return;
    }

    newContacts.push({
      tempId: `proposed-${index}-${person.displayName.replace(/\s+/g, "-").toLowerCase()}`,
      person,
      summary,
    });
  });

  return { newContacts, existingUpdates };
}
