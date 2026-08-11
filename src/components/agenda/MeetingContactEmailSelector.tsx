"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { isValidContactEmail } from "@/lib/calendar/calendar-attendees";
import type { Contact } from "@/types/contact";
import type { ContactEmailOption } from "@/lib/contacts/contact-emails";

interface MeetingContactEmailSelectorProps {
  selectedContact: Contact | null;
  contactEmailOptions: ContactEmailOption[];
  selectedEmails: string[];
  onSelectedEmailsChange: (emails: string[]) => void;
  manualEmail: string;
  onManualEmailChange: (value: string) => void;
  isLoadingEmails?: boolean;
  disabled?: boolean;
}

function isEmailSelected(selectedEmails: string[], email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return selectedEmails.some(
    (value) => value.trim().toLowerCase() === normalized
  );
}

export function MeetingContactEmailSelector({
  selectedContact,
  contactEmailOptions,
  selectedEmails,
  onSelectedEmailsChange,
  manualEmail,
  onManualEmailChange,
  isLoadingEmails = false,
  disabled = false,
}: MeetingContactEmailSelectorProps) {
  const [customEmail, setCustomEmail] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const toggleEmail = (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (isEmailSelected(selectedEmails, email)) {
      onSelectedEmailsChange(
        selectedEmails.filter(
          (value) => value.trim().toLowerCase() !== normalized
        )
      );
      return;
    }
    onSelectedEmailsChange([...selectedEmails, email.trim()]);
  };

  const handleAddCustomEmail = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = customEmail.trim();
    if (!trimmed || !isValidContactEmail(trimmed)) return;

    const normalized = trimmed.toLowerCase();
    if (
      !selectedEmails.some(
        (value) => value.trim().toLowerCase() === normalized
      )
    ) {
      onSelectedEmailsChange([...selectedEmails, trimmed]);
    }
    setCustomEmail("");
    setShowCustomInput(false);
  };

  if (!selectedContact) {
    return (
      <input
        type="email"
        value={manualEmail}
        onChange={(event) => onManualEmailChange(event.target.value)}
        disabled={disabled}
        placeholder="email@example.com"
        className="meeting-borderless-input w-full bg-transparent text-[17px] text-foreground placeholder:text-muted focus:outline-none disabled:opacity-40"
        autoComplete="email"
        inputMode="email"
      />
    );
  }

  if (isLoadingEmails) {
    return (
      <p className="text-sm text-muted">Loading contact emails…</p>
    );
  }

  const customOnlyEmails = selectedEmails.filter(
    (email) =>
      !contactEmailOptions.some(
        (option) =>
          option.email.trim().toLowerCase() === email.trim().toLowerCase()
      )
  );

  return (
    <div className="space-y-3">
      {contactEmailOptions.length > 0 ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Select invite emails"
        >
          {contactEmailOptions.map((option) => {
            const active = isEmailSelected(selectedEmails, option.email);
            return (
              <button
                key={option.key}
                type="button"
                disabled={disabled}
                onClick={() => toggleEmail(option.email)}
                aria-pressed={active}
                className={`meeting-email-chip transition-colors duration-200 ${
                  active ? "meeting-email-chip--active" : ""
                }`}
              >
                <span className="meeting-email-chip-label">{option.label}</span>
                <span className="meeting-email-chip-value">{option.email}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">
          No saved emails for {selectedContact.name}. Add one below.
        </p>
      )}

      {customOnlyEmails.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {customOnlyEmails.map((email) => (
            <button
              key={email}
              type="button"
              disabled={disabled}
              onClick={() => toggleEmail(email)}
              aria-pressed
              className="meeting-email-chip meeting-email-chip--active meeting-email-chip--custom"
            >
              <span className="meeting-email-chip-label">Custom</span>
              <span className="meeting-email-chip-value">{email}</span>
            </button>
          ))}
        </div>
      ) : null}

      {showCustomInput ? (
        <form
          onSubmit={handleAddCustomEmail}
          className="flex items-center gap-2"
        >
          <input
            type="email"
            value={customEmail}
            onChange={(event) => setCustomEmail(event.target.value)}
            disabled={disabled}
            placeholder="name@example.com"
            autoFocus
            className="meeting-email-custom-input min-w-0 flex-1"
            autoComplete="email"
            inputMode="email"
          />
          <button
            type="submit"
            disabled={disabled || !isValidContactEmail(customEmail.trim())}
            className="meeting-email-custom-add shrink-0"
          >
            Add
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setShowCustomInput(false);
              setCustomEmail("");
            }}
            className="shrink-0 text-xs text-muted transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowCustomInput(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-accent-primary-bright"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          Add another email
        </button>
      )}

      {contactEmailOptions.length > 1 && selectedEmails.length === 0 ? (
        <p className="text-xs text-muted">
          Select one or more emails to send calendar invites.
        </p>
      ) : null}
    </div>
  );
}
