"use client";

import { useMemo } from "react";
import type { ContactDetail } from "@/types/contact";
import {
  buildContactInfoRows,
  buildProfileOverviewRows,
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

  const profileOverviewRows = useMemo(
    () => buildProfileOverviewRows(contact),
    [intelMemoKey]
  );
  const contactInfoRows = useMemo(
    () => buildContactInfoRows(contact),
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
    profileOverviewRows.length === 0 &&
    !hasPersonNetwork &&
    contactInfoRows.length === 0 &&
    !hasNotes;

  return (
    <div className="contact-inset-groups">
      <ContactDetailInsetSection
        rows={profileOverviewRows}
        contactId={contact.id}
        sourceMetadata={contact.sourceMetadata}
      />

      <ContactPersonNetworkSection
        contact={contact}
        onContactUpdate={onContactUpdate}
      />

      <ContactProfileNotesCard
        contact={contact}
        onContactUpdate={onContactUpdate}
      />

      <ContactDetailInsetSection
        rows={contactInfoRows}
        contactId={contact.id}
        sourceMetadata={contact.sourceMetadata}
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
