"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Contact } from "@/types/contact";
import {
  DEFAULT_MEETING_FORMAT,
  type MeetingFormatSegment,
} from "@/types/agenda-meeting";
import { defaultMeetingStartLocal, defaultMeetingEndLocal } from "@/lib/calendar/datetime-local";
import { splitDatetimeLocal } from "@/lib/calendar/meeting-picker";
import { readApiJson } from "@/lib/api/read-json";
import { snapshotsEqual } from "@/lib/forms/compare-snapshots";
import {
  composeLogTimeNotes,
  meetingFormatFromSegment,
  resolveDurationMinutesFromRange,
} from "@/lib/time-logs/log-time-form";
import { MeetingFormatSegmentControl } from "@/components/agenda/MeetingFormatSegmentControl";
import { MeetingGroupedCard } from "@/components/agenda/MeetingGroupedCard";
import { MeetingTimingCard } from "@/components/agenda/MeetingTimingCard";
import { MeetingTitleLocationCard } from "@/components/agenda/MeetingTitleLocationCard";
import { MeetingModalSaveButton } from "@/components/agenda/MeetingModalSaveButton";
import { MeetingModalCloseButton } from "@/components/agenda/MeetingModalCloseButton";

interface LogTimeFormSnapshot {
  title: string;
  location: string;
  isAllDay: boolean;
  startAt: string;
  endAt: string;
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
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [startAt, setStartAt] = useState(defaultMeetingStartLocal);
  const [endAt, setEndAt] = useState(() =>
    defaultMeetingEndLocal(defaultMeetingStartLocal())
  );
  const [meetingFormat, setMeetingFormat] =
    useState<MeetingFormatSegment>(DEFAULT_MEETING_FORMAT);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setBaseline(null);
      return;
    }

    const initialStartAt = defaultMeetingStartLocal();
    const initialEndAt = defaultMeetingEndLocal(initialStartAt);

    setTitle("");
    setLocation("");
    setIsAllDay(false);
    setStartAt(initialStartAt);
    setEndAt(initialEndAt);
    setMeetingFormat(DEFAULT_MEETING_FORMAT);
    setNotes("");
    setError(null);

    setBaseline({
      title: "",
      location: "",
      isAllDay: false,
      startAt: initialStartAt,
      endAt: initialEndAt,
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
      isAllDay,
      startAt,
      endAt,
      meetingFormat,
      notes,
      contactId: selectedContact?.id ?? null,
    }),
    [
      title,
      location,
      isAllDay,
      startAt,
      endAt,
      meetingFormat,
      notes,
      selectedContact?.id,
    ]
  );

  const hasChanges =
    baseline !== null && !snapshotsEqual(currentSnapshot, baseline);

  const handleSelectContact = useCallback(
    (contact: Contact) => {
      onSelectedContactChange(contact);
    },
    [onSelectedContactChange]
  );

  const handleClearContact = useCallback(() => {
    onSelectedContactChange(null);
  }, [onSelectedContactChange]);

  const dismissModal = () => {
    onClose();
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!selectedContact) {
      setError("Select a contact for this time log.");
      return;
    }

    let durationTotal = resolveDurationMinutesFromRange(startAt, endAt);
    if (durationTotal === null && isAllDay) {
      durationTotal = 8 * 60;
    }
    if (durationTotal === null) {
      setError("Enter a valid start and end time.");
      return;
    }

    const loggedDate = splitDatetimeLocal(startAt).date;
    if (!loggedDate.trim()) {
      setError("Enter the date for this time entry.");
      return;
    }

    const composedNotes = composeLogTimeNotes({
      title,
      location,
      meetingFormat,
      userNotes: notes,
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
    <div
      className={`fixed inset-0 z-50 flex h-dvh flex-col bg-main transition-opacity duration-200 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-time-title"
    >
      <div className="edit-contact-page edit-contact-page--sheet mx-auto flex h-full w-full max-w-lg flex-col">
        <header
          className="edit-contact-page__nav"
          aria-label="Log time actions"
        >
          <MeetingModalCloseButton
            hasChanges={hasChanges}
            disabled={isSaving}
            onClose={dismissModal}
            onDiscard={dismissModal}
          />

          <h2
            id="log-time-title"
            className="pointer-events-none absolute left-1/2 max-w-[50%] -translate-x-1/2 truncate text-center font-sans text-[17px] font-semibold tracking-tight text-foreground"
          >
            Log Time
          </h2>

          <div className="pointer-events-auto">
            <MeetingModalSaveButton
              formId="log-time-form"
              isDirty={hasChanges}
              isSaving={isSaving}
              savingLabel="Saving time log"
              saveLabel="Save log"
            />
          </div>
        </header>

        <form
          id="log-time-form"
          onSubmit={(event) => void handleSubmit(event)}
          className="edit-contact-body contacts-scroll flex-1 overflow-y-auto [&>*]:shrink-0"
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
            onTitleChange={setTitle}
            onLocationChange={setLocation}
            showEmailSection={false}
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
