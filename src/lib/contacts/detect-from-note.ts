import { parseMultiContactNote } from "@/lib/ai/parse-multi-contact";
import type { ParsedProposedPerson } from "@/lib/ai/parse-multi-contact";
import type { AiRequestContext } from "@/lib/ai/request-context";
import {
  extractNamedConnectionsFromText,
  extractedConnectionToPerson,
} from "@/lib/contacts/extract-named-connections";
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

  const addExtracted = (
    contactId: string,
    contactName: string,
    people: ReturnType<typeof extractNamedConnectionsFromText>
  ) => {
    for (const extracted of people) {
      const key = [extracted.firstName, extracted.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const firstKey = extracted.firstName.toLowerCase();
      if (named.has(key) || named.has(firstKey)) continue;
      named.add(key);
      named.add(firstKey);

      const person = extractedConnectionToPerson(extracted, contactName);
      newConnections.push({
        tempId: `connection-${contactId}-${firstKey}`,
        contactId,
        contactName,
        person,
        summary: summarizeProposedContact(person),
      });
    }
  };

  for (const update of existingUpdates) {
    addExtracted(
      update.contactId,
      update.contactName,
      extractNamedConnectionsFromText(
        [
          transcript,
          update.person.notes,
          update.person.profile?.spouseFirstName
            ? `married to ${[
                update.person.profile.spouseFirstName,
                update.person.profile.spouseLastName,
              ]
                .filter(Boolean)
                .join(" ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
        { contactName: update.contactName }
      )
    );
  }

  return { newContacts, existingUpdates, newConnections };
}

export { personToRelationshipEntry };
