"use client";

import { useMemo } from "react";
import type { ContactDetail } from "@/types/contact";
import {
  buildContactFactRows,
  buildContactInfoRows,
  buildDatesReligionRows,
  buildLabeledInterestRows,
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
  const interestRows = useMemo(
    () => buildLabeledInterestRows(contact),
    [intelMemoKey]
  );
  const datesReligionRows = useMemo(
    () => buildDatesReligionRows(contact),
    [intelMemoKey]
  );
  const factRows = useMemo(
    () => buildContactFactRows(contact),
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
    interestRows.length === 0 &&
    datesReligionRows.length === 0 &&
    factRows.length === 0 &&
    !hasPersonNetwork &&
    !hasNotes;

  return (
    <div className="contact-inset-groups">
      <ContactDetailInsetSection
        rows={relationshipCompanyRows}
        contactId={contact.id}
        sourceMetadata={contact.sourceMetadata}
      />

      <ContactDetailInsetSection
        rows={contactInfoRows}
        contactId={contact.id}
        sourceMetadata={contact.sourceMetadata}
      />

      <ContactDetailInsetSection
        title="Interests"
        rows={interestRows}
        contactId={contact.id}
        sourceMetadata={contact.sourceMetadata}
      />

      <ContactDetailInsetSection
        rows={datesReligionRows}
        contactId={contact.id}
        sourceMetadata={contact.sourceMetadata}
      />

      <ContactDetailInsetSection
        title="Facts"
        rows={factRows}
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
