"use client";

import { useMemo } from "react";
import type { ContactDetail } from "@/types/contact";
import {
  buildContactInfoRows,
  buildInterestsDatesRows,
  buildRelationshipCompanyRows,
  getContactIntelMemoKey,
  hasProfileNotes,
} from "@/lib/contacts/contact-detail-cards";
import { ContactDetailInsetSection } from "@/components/ContactInsetGroup";
import { ContactPersonNetworkSection } from "@/components/ContactPersonNetworkSection";
import { ContactProfileNotesCard } from "@/components/ContactProfileNotesCard";
import {
  KINSIGHT_RELATIONSHIP_TREE_KEY,
  parseRelationshipTree,
} from "@/lib/contacts/relationship-tree";

interface ContactDetailIntelSectionProps {
  contact: ContactDetail;
  onContactUpdate?: (contact: ContactDetail) => void;
}

export function ContactDetailIntelSection({
  contact,
  onContactUpdate,
}: ContactDetailIntelSectionProps) {
  const intelMemoKey = getContactIntelMemoKey(contact);

  const relationshipCompanyRows = useMemo(
    () => buildRelationshipCompanyRows(contact),
    [intelMemoKey]
  );
  const contactInfoRows = useMemo(
    () => buildContactInfoRows(contact),
    [intelMemoKey]
  );
  const interestsDatesRows = useMemo(
    () => buildInterestsDatesRows(contact),
    [intelMemoKey]
  );

  const hasPersonNetwork = useMemo(
    () =>
      parseRelationshipTree(contact.profile?.[KINSIGHT_RELATIONSHIP_TREE_KEY])
        .length > 0,
    [contact.profile]
  );

  const hasNotes = useMemo(() => hasProfileNotes(contact), [intelMemoKey]);

  const showEmptyState =
    relationshipCompanyRows.length === 0 &&
    contactInfoRows.length === 0 &&
    interestsDatesRows.length === 0 &&
    !hasPersonNetwork &&
    !hasNotes;

  return (
    <div className="contact-inset-groups">
      <ContactDetailInsetSection
        title="Relationship & Company"
        rows={relationshipCompanyRows}
        contactId={contact.id}
        sourceMetadata={contact.sourceMetadata}
      />

      <ContactDetailInsetSection
        title="Contact Info"
        rows={contactInfoRows}
        contactId={contact.id}
        sourceMetadata={contact.sourceMetadata}
      />

      <ContactDetailInsetSection
        title="Interests & Important Dates"
        rows={interestsDatesRows}
        contactId={contact.id}
        sourceMetadata={contact.sourceMetadata}
      />

      <ContactPersonNetworkSection
        contact={contact}
        title="Family / Connections"
        onContactUpdate={onContactUpdate}
      />

      <ContactProfileNotesCard
        contact={contact}
        onContactUpdate={onContactUpdate}
      />

      {showEmptyState ? (
        <p className="contact-inset-empty">
          No intel captured yet. Use the quick-add chips above to start building
          this profile.
        </p>
      ) : null}
    </div>
  );
}
