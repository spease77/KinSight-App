import { parseMultiContactNote } from "@/lib/ai/parse-multi-contact";
import type { ParsedProposedPerson } from "@/lib/ai/parse-multi-contact";
import type { AiRequestContext } from "@/lib/ai/request-context";
import { findExistingContactByName } from "@/lib/contacts/match-existing";
import {
  personToRelationshipEntry,
  resolveConnectionAnchorContact,
  shouldTreatPersonAsConnection,
} from "@/lib/contacts/proposed-connection";
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

export type ProposedConnectionForReview = {
  tempId: string;
  contactId: string;
  contactName: string;
  person: ParsedProposedPerson;
  summary: ReturnType<typeof summarizeProposedContact>;
};

export type DetectContactsResult = {
  newContacts: ProposedContactForReview[];
  existingUpdates: ExistingContactUpdate[];
  newConnections: ProposedConnectionForReview[];
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
  const newConnections: ProposedConnectionForReview[] = [];

  people.forEach((person, index) => {
    if (!person.displayName.trim()) return;

    const anchor = resolveConnectionAnchorContact(person, contacts);
    if (shouldTreatPersonAsConnection(person, anchor) && anchor) {
      const summary = summarizeProposedContact(person);
      newConnections.push({
        tempId: `connection-${index}-${person.displayName.replace(/\s+/g, "-").toLowerCase()}`,
        contactId: anchor.id,
        contactName: anchor.name,
        person,
        summary,
      });
      return;
    }

    const existing = findExistingContactByName(person.displayName, contacts);
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

  const named = new Set(
    newConnections.map((item) => item.person.displayName.trim().toLowerCase())
  );

  for (const update of existingUpdates) {
    const first = update.person.profile?.spouseFirstName?.trim();
    if (!first) continue;
    const last = update.person.profile?.spouseLastName?.trim() || "";
    const displayName = [first, last].filter(Boolean).join(" ");
    if (named.has(displayName.toLowerCase())) continue;
    named.add(displayName.toLowerCase());

    const person: ParsedProposedPerson = {
      displayName,
      firstName: first,
      lastName: last || undefined,
      notes:
        [
          update.person.profile?.spouseEducation,
          update.person.profile?.spouseInterests,
        ]
          .filter((value): value is string => Boolean(value?.trim()))
          .join("\n") || undefined,
      relationshipHint: `spouse of ${update.contactName}`,
      recordAs: "connection",
      connectionAnchorName: update.contactName,
      profile: {
        firstName: first,
        ...(last ? { lastName: last } : {}),
      },
      sourceSnippets: {},
    };

    newConnections.push({
      tempId: `connection-spouse-${update.contactId}`,
      contactId: update.contactId,
      contactName: update.contactName,
      person,
      summary: summarizeProposedContact(person),
    });
  }

  return { newContacts, existingUpdates, newConnections };
}

export { personToRelationshipEntry };
