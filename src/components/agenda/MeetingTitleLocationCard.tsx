"use client";

import type { Contact } from "@/types/contact";
import { MeetingGroupedCard } from "@/components/agenda/MeetingGroupedCard";
import { MeetingContactSearchField } from "@/components/agenda/MeetingContactSearchField";
import { MeetingContactEmailSelector } from "@/components/agenda/MeetingContactEmailSelector";
import type { ContactEmailOption } from "@/lib/contacts/contact-emails";

interface MeetingTitleLocationCardProps {
  title: string;
  location: string;
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
  onClearContact: () => void;
  contactEmailOptions: ContactEmailOption[];
  selectedEmails: string[];
  onSelectedEmailsChange: (emails: string[]) => void;
  manualEmail: string;
  onManualEmailChange: (value: string) => void;
  isLoadingContactEmails?: boolean;
  onTitleChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  disabled?: boolean;
}

export function MeetingTitleLocationCard({
  title,
  location,
  selectedContact,
  onSelectContact,
  onClearContact,
  contactEmailOptions,
  selectedEmails,
  onSelectedEmailsChange,
  manualEmail,
  onManualEmailChange,
  isLoadingContactEmails = false,
  onTitleChange,
  onLocationChange,
  disabled = false,
}: MeetingTitleLocationCardProps) {
  return (
    <MeetingGroupedCard>
      <div className="px-4 py-3.5">
        <input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          disabled={disabled}
          placeholder="Title"
          className="meeting-borderless-input w-full bg-transparent text-[17px] text-foreground placeholder:text-muted focus:outline-none disabled:opacity-40"
          autoComplete="off"
        />
      </div>

      <MeetingContactSearchField
        variant="grouped"
        selectedContact={selectedContact}
        onSelectContact={onSelectContact}
        onClearContact={onClearContact}
        disabled={disabled}
      />

      <div className="px-4 py-3.5">
        <input
          type="text"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          disabled={disabled}
          placeholder="Location"
          className="meeting-borderless-input w-full bg-transparent text-[17px] text-foreground placeholder:text-muted focus:outline-none disabled:opacity-40"
          autoComplete="off"
        />
      </div>

      <div className="px-4 py-3.5">
        <MeetingContactEmailSelector
          key={selectedContact?.id ?? "manual"}
          selectedContact={selectedContact}
          contactEmailOptions={contactEmailOptions}
          selectedEmails={selectedEmails}
          onSelectedEmailsChange={onSelectedEmailsChange}
          manualEmail={manualEmail}
          onManualEmailChange={onManualEmailChange}
          isLoadingEmails={isLoadingContactEmails}
          disabled={disabled}
        />
      </div>
    </MeetingGroupedCard>
  );
}
