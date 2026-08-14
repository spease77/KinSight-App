"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import type { Contact, ContactDetail } from "@/types/contact";
import {
  DEFAULT_MEETING_FORMAT,
  type MeetingFormatSegment,
  buildAgendaMeetingTitle,
} from "@/types/agenda-meeting";
import { defaultMeetingStartLocal } from "@/lib/calendar/datetime-local";
import { splitDatetimeLocal } from "@/lib/calendar/meeting-picker";
import { readApiJson } from "@/lib/api/read-json";
import { isValidContactEmail } from "@/lib/calendar/calendar-attendees";
import {
  getContactEmailOptions,
  resolveInitialSelectedEmails,
  type ContactEmailOption,
} from "@/lib/contacts/contact-emails";
import {
  composeLogTimeNotes,
  meetingFormatFromSegment,
  resolveDurationMinutesFromParts,
} from "@/lib/time-logs/log-time-form";
import { MeetingFormatSegmentControl } from "@/components/agenda/MeetingFormatSegmentControl";
import { MeetingGroupedCard } from "@/components/agenda/MeetingGroupedCard";
import { MeetingTitleLocationCard } from "@/components/agenda/MeetingTitleLocationCard";
import { LogTimeTimingCard } from "@/components/investment/LogTimeTimingCard";

interface LogTimeModalProps {
  open: boolean;
  onClose: () => void;
  selectedContact: Contact | null;
  onSelectedContactChange: (contact: Contact | null) => void;
  onLogged?: () => void;
}

export function LogTimeModal({
  open,
  onClose,
  selectedContact,
  onSelectedContactChange,
  onLogged,
}: LogTimeModalProps) {
  const [entered, setEntered] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [contactEmailOptions, setContactEmailOptions] = useState<
    ContactEmailOption[]
  >([]);
  const [isLoadingContactEmails, setIsLoadingContactEmails] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [loggedAt, setLoggedAt] = useState(defaultMeetingStartLocal);
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [meetingFormat, setMeetingFormat] =
    useState<MeetingFormatSegment>(DEFAULT_MEETING_FORMAT);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = useCallback(() => {
    setTitle("");
    setLocation("");
    setManualEmail("");
    setSelectedEmails([]);
    setContactEmailOptions([]);
    setIsLoadingContactEmails(false);
    setIsAllDay(false);
    setLoggedAt(defaultMeetingStartLocal());
    setDurationHours("");
    setDurationMinutes("30");
    setMeetingFormat(DEFAULT_MEETING_FORMAT);
    setNotes("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }

    resetForm();
    if (selectedContact) {
      setTitle(buildAgendaMeetingTitle(selectedContact.name, DEFAULT_MEETING_FORMAT));
    }

    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open, resetForm, selectedContact?.id]);

  const handleSelectContact = useCallback(
    async (contact: Contact) => {
      onSelectedContactChange(contact);
      setSelectedEmails([]);
      setManualEmail("");
      setContactEmailOptions([]);
      setIsLoadingContactEmails(true);

      setTitle((current) =>
        current.trim()
          ? current
          : buildAgendaMeetingTitle(contact.name, meetingFormat)
      );

      try {
        const res = await fetch(`/api/contacts/${contact.id}`);
        const data = await readApiJson<{ contact?: ContactDetail }>(res);
        const options = getContactEmailOptions(data.contact?.profile);
        setContactEmailOptions(options);
        setSelectedEmails(resolveInitialSelectedEmails(options));
      } catch {
        setContactEmailOptions([]);
      } finally {
        setIsLoadingContactEmails(false);
      }
    },
    [meetingFormat, onSelectedContactChange]
  );

  const handleClearContact = useCallback(() => {
    onSelectedContactChange(null);
    setSelectedEmails([]);
    setManualEmail("");
    setContactEmailOptions([]);
    setIsLoadingContactEmails(false);
  }, [onSelectedContactChange]);

  const resolveInviteEmails = (): string[] => {
    if (selectedContact) {
      return selectedEmails
        .map((email) => email.trim())
        .filter((email) => isValidContactEmail(email));
    }

    const trimmed = manualEmail.trim();
    return trimmed && isValidContactEmail(trimmed) ? [trimmed] : [];
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!selectedContact) {
      setError("Select a contact for this time log.");
      return;
    }

    let durationTotal = resolveDurationMinutesFromParts(
      durationHours,
      durationMinutes
    );
    if (durationTotal === null && isAllDay) {
      durationTotal = 8 * 60;
    }
    if (durationTotal === null) {
      setError("Enter a valid duration in hours and minutes.");
      return;
    }

    const loggedDate = splitDatetimeLocal(loggedAt).date;
    if (!loggedDate.trim()) {
      setError("Enter the date for this time entry.");
      return;
    }

    const inviteEmails = resolveInviteEmails();
    const composedNotes = composeLogTimeNotes({
      title,
      location,
      meetingFormat,
      userNotes:
        inviteEmails.length > 0
          ? `${notes.trim() ? `${notes.trim()}\n\n` : ""}Contact email: ${inviteEmails.join(", ")}`
          : notes,
    });

    setIsSaving(true);
    try {
      const res = await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact.id,
          durationMinutes: durationTotal,
          loggedDate,
          notes: composedNotes ?? undefined,
          meetingFormat: meetingFormatFromSegment(meetingFormat),
        }),
      });
      const data = await readApiJson<{ error?: string }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Could not save time.");
      }

      onLogged?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save time.");
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = Boolean(selectedContact);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 sm:items-center ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-time-title"
      onClick={handleClose}
    >
      <div
        className={`meeting-sheet flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden bg-main shadow-2xl transition-all duration-300 ease-out sm:rounded-2xl ${
          entered
            ? "translate-y-0 opacity-100"
            : "translate-y-6 opacity-0 sm:translate-y-2 sm:scale-[0.98]"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border-green/50 bg-main px-4 py-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="meeting-modal-header-btn text-muted transition-all duration-200 hover:text-foreground disabled:opacity-40"
            aria-label="Cancel"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>

          <h2
            id="log-time-title"
            className="flex-1 text-center font-sans text-[17px] font-semibold tracking-tight text-foreground"
          >
            Add Time
          </h2>

          <button
            type="submit"
            form="log-time-form"
            disabled={isSaving || !canSave}
            className={`meeting-modal-header-btn meeting-modal-save-btn transition-all duration-200 ${
              canSave
                ? "meeting-modal-save-btn--active"
                : "pointer-events-none opacity-30"
            } ${isSaving ? "opacity-80" : ""}`}
            aria-label={isSaving ? "Saving time log" : "Save log"}
            aria-disabled={!canSave || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
            ) : (
              <Check className="h-5 w-5" strokeWidth={2.5} />
            )}
          </button>
        </header>

        <form
          id="log-time-form"
          onSubmit={(event) => void handleSubmit(event)}
          className="contacts-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 pb-6 [&>*]:shrink-0"
        >
          <MeetingFormatSegmentControl
            value={meetingFormat}
            onChange={setMeetingFormat}
            disabled={isSaving}
          />

          <MeetingTitleLocationCard
            title={title}
            location={location}
            selectedContact={selectedContact}
            onSelectContact={handleSelectContact}
            onClearContact={handleClearContact}
            contactEmailOptions={contactEmailOptions}
            selectedEmails={selectedEmails}
            onSelectedEmailsChange={setSelectedEmails}
            manualEmail={manualEmail}
            onManualEmailChange={setManualEmail}
            isLoadingContactEmails={isLoadingContactEmails}
            onTitleChange={setTitle}
            onLocationChange={setLocation}
            disabled={isSaving}
          />

          <LogTimeTimingCard
            loggedAt={loggedAt}
            onLoggedAtChange={setLoggedAt}
            durationHours={durationHours}
            durationMinutes={durationMinutes}
            onDurationHoursChange={setDurationHours}
            onDurationMinutesChange={setDurationMinutes}
            isAllDay={isAllDay}
            onAllDayChange={setIsAllDay}
            disabled={isSaving}
          />

          <MeetingGroupedCard>
            <div className="px-4 py-3">
              <label
                htmlFor="log-time-notes"
                className="mb-2 block text-[15px] text-foreground"
              >
                Brief Notes / Objective
              </label>
              <textarea
                id="log-time-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isSaving}
                rows={4}
                placeholder="Key talking points, goals, or context for this interaction…"
                className="meeting-notes-input w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted focus:outline-none disabled:opacity-40"
              />
            </div>
          </MeetingGroupedCard>

          {error ? (
            <p className="px-1 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
