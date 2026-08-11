"use client";

import { useCallback, useMemo, useState } from "react";
import type { ContactDetail } from "@/types/contact";
import type { ContactProfile } from "@/types/contact-profile";
import { ContactInsetGroup } from "@/components/ContactInsetGroup";
import { RelatedPersonFactsRow } from "@/components/RelatedPersonFactsRow";
import { persistContactProfile } from "@/lib/contacts/contact-quick-add-persist";
import {
  KINSIGHT_RELATIONSHIP_TREE_KEY,
  normalizeRelationshipFacts,
  parseRelationshipTree,
  serializeRelationshipTree,
  sortRelationshipTreeByCloseness,
  withRelationshipEntryFacts,
} from "@/lib/contacts/relationship-tree";

interface ContactPersonNetworkSectionProps {
  contact: ContactDetail;
  onContactUpdate?: (contact: ContactDetail) => void;
}

export function ContactPersonNetworkSection({
  contact,
  onContactUpdate,
}: ContactPersonNetworkSectionProps) {
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [activeFactPersonId, setActiveFactPersonId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      sortRelationshipTreeByCloseness(
        parseRelationshipTree(contact.profile?.[KINSIGHT_RELATIONSHIP_TREE_KEY])
      ),
    [contact.profile?.[KINSIGHT_RELATIONSHIP_TREE_KEY]]
  );

  const handleFactsChange = useCallback(
    async (entryId: string, facts: string[]) => {
      const profile = contact.profile ?? {};
      const currentEntries = parseRelationshipTree(
        profile[KINSIGHT_RELATIONSHIP_TREE_KEY]
      );
      const cleanedFacts = normalizeRelationshipFacts(facts);

      const nextEntries = currentEntries.map((entry) =>
        entry.id === entryId
          ? withRelationshipEntryFacts(entry, cleanedFacts)
          : entry
      );

      const nextProfile: ContactProfile = {
        ...profile,
        [KINSIGHT_RELATIONSHIP_TREE_KEY]: serializeRelationshipTree(nextEntries),
      };

      setSavingEntryId(entryId);
      setError(null);

      try {
        const result = await persistContactProfile(contact.id, nextProfile);
        if (!result.contact) {
          throw new Error(result.error ?? "Could not save fact.");
        }
        onContactUpdate?.(result.contact);
        setActiveFactPersonId(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not save fact.";
        setError(message);
        throw new Error(message);
      } finally {
        setSavingEntryId(null);
      }
    },
    [contact.id, contact.profile, onContactUpdate]
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <ContactInsetGroup>
      {entries.map((entry, index) => (
        <RelatedPersonFactsRow
          key={entry.id}
          entry={entry}
          isLast={index === entries.length - 1}
          isSaving={savingEntryId === entry.id}
          isAddingFact={activeFactPersonId === entry.id}
          onStartAddFact={() => setActiveFactPersonId(entry.id)}
          onCancelAddFact={() => setActiveFactPersonId(null)}
          onFactsChange={handleFactsChange}
        />
      ))}
      {error && (
        <p
          className="related-person-row__error related-person-row__error--section"
          role="alert"
        >
          {error}
        </p>
      )}
    </ContactInsetGroup>
  );
}
