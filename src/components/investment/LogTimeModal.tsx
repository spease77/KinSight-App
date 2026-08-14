"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
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
import { snapshotsEqual } from "@/lib/forms/compare-snapshots";
import {
  composeLogTimeNotes,
  meetingFormatFromSegment,
  resolveDurationMinutesFromParts,
} from "@/lib/time-logs/log-time-form";
import { MeetingFormatSegmentControl } from "@/components/agenda/MeetingFormatSegmentControl";
import { MeetingGroupedCard } from "@/components/agenda/MeetingGroupedCard";
import { MeetingTitleLocationCard } from "@/components/agenda/MeetingTitleLocationCard";
import { MeetingModalSaveButton } from "@/components/agenda/MeetingModalSaveButton";
import { LogTimeTimingCard } from "@/components/investment/LogTimeTimingCard";
import { DiscardChangesConfirmModal } from "@/components/DiscardChangesConfirmModal";

interface LogTimeFormSnapshot {
  title: string;
  location: string;
  manualEmail: string;
  selectedEmails: string[];
  isAllDay: boolean;
  loggedAt: string;
  durationHours: string;
  durationMinutes: string;
  meetingFormat: MeetingFormatSegment;
  notes: string;
  contactId: string | null;
}

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
  const [baseline, setBaseline] = useState<LogTimeFormSnapshot | null>(null);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
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

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setBaseline(null);
      setDiscardPromptOpen(false);
      return;
    }

    const initialLoggedAt = defaultMeetingStartLocal();
    const initialTitle = selectedContact
      ? buildAgendaMeetingTitle(selectedContact.name, DEFAULT_MEETING_FORMAT)
      : "";

    setTitle(initialTitle);
    setLocation("");
    setManualEmail("");
    setSelectedEmails([]);
    setContactEmailOptions([]);
    setIsLoadingContactEmails(false);
    setIsAllDay(false);
    setLoggedAt(initialLoggedAt);
    setDurationHours("");
    setDurationMinutes("30");
    setMeetingFormat(DEFAULT_MEETING_FORMAT);
    setNotes("");
    setError(null);

    setBaseline({
      title: initialTitle,
      location: "",
      manualEmail: "",
      selectedEmails: [],
      isAllDay: false,
      loggedAt: initialLoggedAt,
      durationHours: "",
      durationMinutes: "30",
      meetingFormat: DEFAULT_MEETING_FORMAT,
      notes: "",
      contactId: selectedContact?.id ?? null,
    });

    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open, selectedContact?.id]);

  const currentSnapshot = useMemo<LogTimeFormSnapshot>(
    () => ({
      title,
      location,
      manualEmail,
      selectedEmails,
      isAllDay,
      loggedAt,
      durationHours,
      durationMinutes,
      meetingFormat,
      notes,
      contactId: selectedContact?.id ?? null,
    }),
    [
      title,
      location,
      manualEmail,
      selectedEmails,
      isAllDay,
      loggedAt,
      durationHours,
      durationMinutes,
      meetingFormat,
      notes,
      selectedContact?.id,
    ]
  );

  const hasChanges =
    baseline !== null && !snapshotsEqual(currentSnapshot, baseline);

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

  const dismissModal = () => {
    setDiscardPromptOpen(false);
    onClose();
  };

  const handleCloseRequest = () => {
    if (isSaving) return;

    if (hasChanges) {
      setDiscardPromptOpen(true);
      return;
    }

    dismissModal();
  };

  const handleDiscardChanges = () => {
    if (isSaving) return;
    dismissModal();
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
      dismissModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save time.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 flex h-dvh flex-col bg-main transition-opacity duration-200 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-time-title"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border-green/50 bg-main px-4 py-3">
          <button
            type="button"
            onClick={handleCloseRequest}
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
            Log Time
          </h2>

          <MeetingModalSaveButton
            formId="log-time-form"
            isDirty={hasChanges}
            isSaving={isSaving}
            savingLabel="Saving time log"
            saveLabel="Save log"
          />
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

      {discardPromptOpen ? (
        <DiscardChangesConfirmModal
          message="Are you sure you want to discard this time log?"
          onCancel={() => setDiscardPromptOpen(false)}
          onDiscard={handleDiscardChanges}
        />
      ) : null}
    </>
  );
}
