"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Contact, ContactDetail } from "@/types/contact";
import {
  DEFAULT_MEETING_FORMAT,
  type MeetingFormatSegment,
  buildAgendaMeetingTitle,
  composeMeetingNotes,
} from "@/types/agenda-meeting";
import {
  datetimeLocalToIso,
  defaultMeetingEndLocal,
  defaultMeetingStartLocal,
} from "@/lib/calendar/datetime-local";
import { readApiJson } from "@/lib/api/read-json";
import { isValidContactEmail } from "@/lib/calendar/calendar-attendees";
import {
  getContactEmailOptions,
  resolveInitialSelectedEmails,
  type ContactEmailOption,
} from "@/lib/contacts/contact-emails";
import { showSuccessToast } from "@/lib/ui/toast";
import { snapshotsEqual } from "@/lib/forms/compare-snapshots";
import { MeetingFormatSegmentControl } from "@/components/agenda/MeetingFormatSegmentControl";
import { MeetingGroupedCard } from "@/components/agenda/MeetingGroupedCard";
import { MeetingIosSwitch } from "@/components/agenda/MeetingIosSwitch";
import { MeetingTimingCard } from "@/components/agenda/MeetingTimingCard";
import { MeetingTitleLocationCard } from "@/components/agenda/MeetingTitleLocationCard";
import { MeetingModalSaveButton } from "@/components/agenda/MeetingModalSaveButton";
import { DiscardChangesConfirmModal } from "@/components/DiscardChangesConfirmModal";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";

interface MeetingFormSnapshot {
  title: string;
  location: string;
  manualEmail: string;
  selectedEmails: string[];
  isAllDay: boolean;
  startAt: string;
  endAt: string;
  meetingFormat: MeetingFormatSegment;
  pushToExternalCalendar: boolean;
  notes: string;
  contactId: string | null;
}

interface AddMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (interaction: ScheduledInteraction) => void;
}

export function AddMeetingModal({
  open,
  onClose,
  onSaved,
}: AddMeetingModalProps) {
  const [entered, setEntered] = useState(false);
  const [baseline, setBaseline] = useState<MeetingFormSnapshot | null>(null);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [contactEmailOptions, setContactEmailOptions] = useState<
    ContactEmailOption[]
  >([]);
  const [isLoadingContactEmails, setIsLoadingContactEmails] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startAt, setStartAt] = useState(defaultMeetingStartLocal);
  const [endAt, setEndAt] = useState(() =>
    defaultMeetingEndLocal(defaultMeetingStartLocal())
  );
  const [meetingFormat, setMeetingFormat] =
    useState<MeetingFormatSegment>(DEFAULT_MEETING_FORMAT);
  const [pushToExternalCalendar, setPushToExternalCalendar] = useState(true);
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

    const start = defaultMeetingStartLocal();
    const end = defaultMeetingEndLocal(start);

    setTitle("");
    setLocation("");
    setManualEmail("");
    setSelectedEmails([]);
    setContactEmailOptions([]);
    setIsLoadingContactEmails(false);
    setSelectedContact(null);
    setIsAllDay(false);
    setStartAt(start);
    setEndAt(end);
    setMeetingFormat(DEFAULT_MEETING_FORMAT);
    setPushToExternalCalendar(true);
    setNotes("");
    setError(null);

    setBaseline({
      title: "",
      location: "",
      manualEmail: "",
      selectedEmails: [],
      isAllDay: false,
      startAt: start,
      endAt: end,
      meetingFormat: DEFAULT_MEETING_FORMAT,
      pushToExternalCalendar: true,
      notes: "",
      contactId: null,
    });

    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const currentSnapshot = useMemo<MeetingFormSnapshot>(
    () => ({
      title,
      location,
      manualEmail,
      selectedEmails,
      isAllDay,
      startAt,
      endAt,
      meetingFormat,
      pushToExternalCalendar,
      notes,
      contactId: selectedContact?.id ?? null,
    }),
    [
      title,
      location,
      manualEmail,
      selectedEmails,
      isAllDay,
      startAt,
      endAt,
      meetingFormat,
      pushToExternalCalendar,
      notes,
      selectedContact?.id,
    ]
  );

  const hasChanges =
    baseline !== null && !snapshotsEqual(currentSnapshot, baseline);

  const handleSelectContact = useCallback(
    async (contact: Contact) => {
      setSelectedContact(contact);
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
    [meetingFormat]
  );

  const handleClearContact = useCallback(() => {
    setSelectedContact(null);
    setSelectedEmails([]);
    setManualEmail("");
    setContactEmailOptions([]);
    setIsLoadingContactEmails(false);
  }, []);

  const resolveInviteEmails = (): string[] => {
    if (selectedContact) {
      return selectedEmails
        .map((email) => email.trim())
        .filter((email) => isValidContactEmail(email));
    }

    const trimmed = manualEmail.trim();
    return trimmed && isValidContactEmail(trimmed) ? [trimmed] : [];
  };

  const handleStartChange = (value: string) => {
    setStartAt(value);
    const currentEnd = new Date(endAt);
    const nextStart = new Date(value);
    if (
      Number.isNaN(currentEnd.getTime()) ||
      Number.isNaN(nextStart.getTime()) ||
      currentEnd <= nextStart
    ) {
      setEndAt(defaultMeetingEndLocal(value));
    }
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

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Enter a title for this event.");
      return;
    }

    if (!selectedContact) {
      setError("Select a contact for this meeting.");
      return;
    }

    const inviteEmails = resolveInviteEmails();
    if (inviteEmails.length === 0) {
      setError(
        selectedContact
          ? "Select at least one email to invite."
          : "Enter a valid contact email address."
      );
      return;
    }

    let scheduledAt: string;
    let scheduledEndAt: string;

    try {
      scheduledAt = datetimeLocalToIso(startAt);
      scheduledEndAt = datetimeLocalToIso(endAt);
    } catch {
      setError("Enter a valid start and end date/time.");
      return;
    }

    if (new Date(scheduledEndAt) <= new Date(scheduledAt)) {
      setError("End time must be after the start time.");
      return;
    }

    setIsSaving(true);

    try {
      const composedNotes = composeMeetingNotes(meetingFormat, notes, location);

      const res = await fetch("/api/scheduled-interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact.id,
          scheduledAt,
          scheduledEndAt,
          title: trimmedTitle,
          notes: composedNotes,
          meetingType: meetingFormat,
          pushToExternalCalendar,
          contactEmails: inviteEmails,
          contactEmail: inviteEmails[0],
        }),
      });

      const data = await readApiJson<{
        interaction?: ScheduledInteraction;
        error?: string;
      }>(res);

      if (!res.ok || !data.interaction) {
        throw new Error(data.error ?? "Could not save meeting.");
      }

      if (pushToExternalCalendar) {
        const inviteLabel =
          inviteEmails.length === 1
            ? inviteEmails[0]
            : `${inviteEmails.length} invitees`;
        showSuccessToast(
          inviteEmails.length > 0
            ? `Meeting saved! Sending calendar invites to ${inviteLabel}…`
            : "Meeting saved! Syncing with your calendar in the background…"
        );
      } else {
        showSuccessToast("Meeting saved to KinSight.");
      }

      onSaved?.(data.interaction);
      dismissModal();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save meeting."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 sm:items-center ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-meeting-title"
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
              onClick={handleCloseRequest}
              disabled={isSaving}
              className="meeting-modal-header-btn text-muted transition-all duration-200 hover:text-foreground disabled:opacity-40"
              aria-label="Cancel"
            >
              <X className="h-5 w-5" strokeWidth={2.25} />
            </button>

            <h2
              id="add-meeting-title"
              className="flex-1 text-center font-sans text-[17px] font-semibold tracking-tight text-foreground"
            >
              New Event
            </h2>

            <MeetingModalSaveButton
              formId="add-meeting-form"
              isDirty={hasChanges}
              isSaving={isSaving}
              savingLabel="Saving event"
              saveLabel="Save event"
            />
          </header>

        <form
          id="add-meeting-form"
          onSubmit={(event) => void handleSave(event)}
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

          <MeetingTimingCard
            isAllDay={isAllDay}
            onAllDayChange={setIsAllDay}
            startAt={startAt}
            endAt={endAt}
            onStartChange={handleStartChange}
            onEndChange={setEndAt}
            disabled={isSaving}
          />

          <MeetingGroupedCard>
            <div className="flex min-h-[3.25rem] items-center justify-between gap-4 px-4 py-3">
              <span className="text-[15px] text-foreground">
                Push to External Calendar(s)
              </span>
              <MeetingIosSwitch
                checked={pushToExternalCalendar}
                onChange={setPushToExternalCalendar}
                disabled={isSaving}
                label="Push meeting to external calendar(s)"
              />
            </div>

            <div className="px-4 py-3">
              <label
                htmlFor="meeting-notes"
                className="mb-2 block text-[15px] text-foreground"
              >
                Brief Notes / Objective
              </label>
              <textarea
                id="meeting-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isSaving}
                rows={4}
                placeholder="Key talking points, goals, or context for your pre-meeting brief…"
                className="meeting-notes-input w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted focus:outline-none disabled:opacity-40"
              />
            </div>
          </MeetingGroupedCard>

          {pushToExternalCalendar ? (
            <p className="px-1 text-xs leading-relaxed text-muted">
              {selectedContact && selectedEmails.length > 0
                ? selectedEmails.length === 1
                  ? "KinSight will sync this event and send a calendar invite with Accept/Decline to the selected email."
                  : `KinSight will sync this event and send calendar invites to ${selectedEmails.length} selected emails.`
                : manualEmail.trim()
                  ? "KinSight will sync this event and send a calendar invite with Accept/Decline to the contact email."
                  : "KinSight will sync this event to Google or Outlook in the background."}
            </p>
          ) : (
            <p className="px-1 text-xs leading-relaxed text-muted">
              Saves as an internal KinSight-only event — your corporate calendar
              stays clean.
            </p>
          )}

          {error ? (
            <p className="px-1 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </form>
        </div>
      </div>

      {discardPromptOpen ? (
        <DiscardChangesConfirmModal
          message="Are you sure you want to discard this new event?"
          onCancel={() => setDiscardPromptOpen(false)}
          onDiscard={handleDiscardChanges}
        />
      ) : null}
    </>
  );
}
