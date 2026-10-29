import { parseMultiContactNote } from "@/lib/ai/parse-multi-contact";
import type { ParsedProposedPerson } from "@/lib/ai/parse-multi-contact";
import type { AiRequestContext } from "@/lib/ai/request-context";
import {
  extractContactIntelFromText,
  type AmbiguousIntelItem,
} from "@/lib/contacts/extract-contact-intel";
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
import {
  loadContactResolutionRecords,
  resolveContact,
  type ResolveContactCandidate,
} from "@/lib/services/contactResolver";
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

export type PendingContactResolution = {
  spokenName: string;
  person: ParsedProposedPerson;
  summary: ReturnType<typeof summarizeProposedContact>;
  candidates: ResolveContactCandidate[];
};

export type DetectContactsResult = {
  newContacts: ProposedContactForReview[];
  existingUpdates: ExistingContactUpdate[];
  newConnections: ProposedConnectionForReview[];
  ambiguousIntel: AmbiguousIntelItem[];
  pendingResolutions: PendingContactResolution[];
};

function personEmail(person: ParsedProposedPerson): string | undefined {
  return (
    person.profile.businessEmail?.trim() ||
    person.profile.personalEmail?.trim() ||
    person.profile.otherEmail?.trim() ||
    undefined
  );
}

export async function detectContactsFromNote(
  transcript: string,
  requestContext: AiRequestContext
): Promise<DetectContactsResult> {
  const [{ contacts }, people, records] = await Promise.all([
    fetchContacts(),
    parseMultiContactNote(transcript, requestContext),
    loadContactResolutionRecords(),
  ]);

  const newContacts: ProposedContactForReview[] = [];
  const existingUpdates: ExistingContactUpdate[] = [];
  const newConnections: ProposedConnectionForReview[] = [];
  const pendingResolutions: PendingContactResolution[] = [];
  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));

  for (const [index, person] of people.entries()) {
    if (!person.displayName.trim()) continue;

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
      continue;
    }

    const summary = summarizeProposedContact(person);
    const resolved = await resolveContact(
      {
        name: person.displayName,
        email: personEmail(person),
        contextCompany: person.company || person.profile.companyName,
      },
      { records, allowLlm: true }
    );
    const matched = resolved.contact_id
      ? contactsById.get(resolved.contact_id)
      : undefined;

    if (matched && !resolved.needs_confirmation) {
      existingUpdates.push({
        contactId: matched.id,
        contactName: matched.name,
        existingCompany: matched.company,
        person,
        summary,
      });
      continue;
    }

    if (resolved.needs_confirmation && resolved.candidates.length > 0) {
      pendingResolutions.push({
        spokenName: person.displayName,
        person,
        summary,
        candidates: resolved.candidates,
      });
      continue;
    }

    const fallback = findExistingContactByName(person.displayName, contacts);
    if (fallback) {
      existingUpdates.push({
        contactId: fallback.id,
        contactName: fallback.name,
        existingCompany: fallback.company,
        person,
        summary,
      });
      continue;
    }

    newContacts.push({
      tempId: `proposed-${index}-${person.displayName.replace(/\s+/g, "-").toLowerCase()}`,
      person,
      summary,
    });
  }

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

  const ambiguousIntel: AmbiguousIntelItem[] = [];
  const seenAmbiguous = new Set<string>();
  for (const update of existingUpdates) {
    const extracted = extractContactIntelFromText(transcript, {
      contactName: update.contactName,
      connections: newConnections
        .filter((item) => item.contactId === update.contactId)
        .map((item) => personToRelationshipEntry(item.person)),
    });
    for (const item of extracted.ambiguous) {
      const key = item.text.toLowerCase();
      if (seenAmbiguous.has(key)) continue;
      seenAmbiguous.add(key);
      ambiguousIntel.push({
        ...item,
        contactId: update.contactId,
        contactName: update.contactName,
        candidates: item.candidates.map((candidate) =>
          candidate.kind === "contact"
            ? { ...candidate, name: update.contactName }
            : candidate
        ),
      });
    }
  }

  return {
    newContacts,
    existingUpdates,
    newConnections,
    ambiguousIntel,
    pendingResolutions,
  };
}

export { personToRelationshipEntry };
