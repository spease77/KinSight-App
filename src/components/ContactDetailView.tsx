"use client";

import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import type { ContactDetail } from "@/types/contact";
import { ContactQuickActions } from "@/components/ContactQuickActions";
import { ContactPhotoUpload } from "@/components/ContactPhotoUpload";
import { ContactDetailIntelSection } from "@/components/ContactDetailIntelSection";
import { ContactAnchorQuickAdd } from "@/components/ContactAnchorQuickAdd";
import { ContactTimeLogSection } from "@/components/ContactTimeLogSection";
import { PreMeetingBriefing } from "@/components/PreMeetingBriefing";
import { ContactDetailNavBar } from "@/components/ContactDetailNavBar";
import { VoiceCaptureModal } from "@/components/VoiceCaptureModal";
import { MicPermissionModal } from "@/components/MicPermissionModal";
import { useVoiceDebrief } from "@/hooks/useVoiceDebrief";
import { readApiJson } from "@/lib/api/read-json";
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
  const debrief = useVoiceDebrief();

  useEffect(() => {
    setSortBy(loadContactSortPreference());
  }, []);

  const displayName = formatContactDisplayName(contact.name, sortBy);

  return (
    <div className="contact-detail-view">
      <ContactDetailNavBar contactId={contact.id} />

      <div className="contact-detail-page flex flex-col px-5 pb-8">
      <div className="contact-detail-hero flex w-full flex-col items-center gap-3.5">
        <ContactPhotoUpload
          contact={contact}
          sortBy={sortBy}
          variant="detail"
          onContactUpdate={onContactUpdate}
        />

        <div className="contact-detail-hero__identity">
          <h1 className="contact-detail-hero__name text-3xl font-normal tracking-tight">
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

        <button
          type="button"
          onClick={debrief.start}
          className="ui-btn-outline-green flex w-full max-w-xs items-center justify-center gap-2 px-4 py-2.5 text-sm"
        >
          <Mic className="h-4 w-4" strokeWidth={2} />
          Record debrief
        </button>

        <ContactAnchorQuickAdd
          contact={contact}
          variant="detail"
          onContactUpdate={onContactUpdate}
        />
      </div>

      <PreMeetingBriefing contactId={contact.id} />

      <ContactDetailIntelSection
        contact={contact}
        onContactUpdate={onContactUpdate}
      />
      </div>

      {debrief.failure ? (
        <MicPermissionModal
          failure={debrief.failure}
          onDismiss={debrief.clearFailure}
        />
      ) : null}

      <VoiceCaptureModal
        open={debrief.open}
        stream={debrief.stream}
        contactId={contact.id}
        onClose={debrief.close}
        onComplete={() => {
          void (async () => {
            const res = await fetch(`/api/contacts/${contact.id}`);
            const data = await readApiJson<{ contact?: ContactDetail }>(res);
            if (data.contact) onContactUpdate?.(data.contact);
          })();
        }}
      />
    </div>
  );
}
