"use client";

import { useEffect, useState } from "react";
import type { ContactDetail } from "@/types/contact";
import { ContactQuickActions } from "@/components/ContactQuickActions";
import { ContactPhotoUpload } from "@/components/ContactPhotoUpload";
import { ContactDetailIntelSection } from "@/components/ContactDetailIntelSection";
import { ContactAnchorQuickAdd } from "@/components/ContactAnchorQuickAdd";
import { ContactTimeLogSection } from "@/components/ContactTimeLogSection";
import { ContactDetailNavBar } from "@/components/ContactDetailNavBar";
import {
  formatContactDisplayName,
  loadContactSortPreference,
  type ContactSortField,
} from "@/lib/contacts/sort-contacts";
import { useContactTimeTotal } from "@/hooks/useContactTimeTotal";

interface ContactDetailViewProps {
  contact: ContactDetail;
  onContactUpdate?: (contact: ContactDetail) => void;
}

export function ContactDetailView({
  contact,
  onContactUpdate,
}: ContactDetailViewProps) {
  const [sortBy, setSortBy] = useState<ContactSortField>("first");
  const [timeRefreshToken, setTimeRefreshToken] = useState(0);
  const { totalMinutes } = useContactTimeTotal(contact.id, timeRefreshToken);

  useEffect(() => {
    setSortBy(loadContactSortPreference());
  }, []);

  const displayName = formatContactDisplayName(contact.name, sortBy);

  return (
    <div className="contact-detail-view">
      <ContactDetailNavBar contactId={contact.id} />

      <div className="contact-detail-page flex flex-col gap-6 px-5 pb-8">
      <div className="contact-detail-hero flex w-full flex-col items-center gap-3">
        <ContactPhotoUpload
          contact={contact}
          sortBy={sortBy}
          variant="detail"
          onContactUpdate={onContactUpdate}
        />

        <div className="contact-detail-hero__identity">
          <h1 className="contact-detail-hero__name text-3xl font-normal tracking-tight text-white">
            {displayName}
          </h1>
        </div>

        <ContactTimeLogSection
          contactId={contact.id}
          variant="heroPill"
          totalMinutes={totalMinutes}
          onLogged={() => setTimeRefreshToken((current) => current + 1)}
        />

        <div className="contact-detail-hero__comm-actions">
          <ContactQuickActions profile={contact.profile} />
        </div>
      </div>

      <ContactAnchorQuickAdd
        contact={contact}
        variant="detail"
        onContactUpdate={onContactUpdate}
      />

      <ContactDetailIntelSection
        contact={contact}
        onContactUpdate={onContactUpdate}
      />
      </div>
    </div>
  );
}
