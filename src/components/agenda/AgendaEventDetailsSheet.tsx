"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Lock,
  MapPin,
  Mic,
  NotebookText,
  Pencil,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { VoiceCaptureModal } from "@/components/VoiceCaptureModal";
import { MicPermissionModal } from "@/components/MicPermissionModal";
import { useVoiceDebrief } from "@/hooks/useVoiceDebrief";
import { CalendarSourceBadge } from "@/components/calendar/CalendarSourceBadge";
import {
  behavioralTagPillClass,
  formatBehavioralTagLabel,
} from "@/lib/psychological-profile";
import { getInteractionMeetingLabel } from "@/lib/agenda/sort-interactions";
import {
  formatAgendaDateHeader,
  formatAgendaEventTime,
} from "@/lib/agenda/time-frame";
import { readApiJson } from "@/lib/api/read-json";
import {
  datetimeLocalToIso,
  defaultMeetingEndLocal,
  isoToDatetimeLocal,
} from "@/lib/calendar/datetime-local";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { parseMeetingNotes } from "@/types/agenda-meeting";
import {
  calendarSourceLabel,
  externalCalendarUrl,
  isLinkedContactId,
  isReadOnlyInteraction,
  type ScheduledInteraction,
} from "@/types/scheduled-interaction";

interface AgendaEventDetailsSheetProps {
  /** One event, or every event on a tapped day (month view). */
  interactions: ScheduledInteraction[] | null;
  onClose: () => void;
  onApplyLocalUpdate: (interaction: ScheduledInteraction) => void;
}

const ALL_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}T00:00:00$/;
const DAY_MINUTES = 24 * 60;

function isAllDay(interaction: ScheduledInteraction): boolean {
  return (
    ALL_DAY_PATTERN.test(interaction.scheduledAt) &&
    (interaction.durationMinutes ?? 0) >= DAY_MINUTES
  );
}

function formatWhen(interaction: ScheduledInteraction): {
  date: string;
  time: string;
} {
  const start = new Date(interaction.scheduledAt);
  const dateLabel = toTitleCase(formatAgendaDateHeader(start));

  if (isAllDay(interaction)) {
    const days = Math.round((interaction.durationMinutes ?? DAY_MINUTES) / DAY_MINUTES);
    if (days > 1) {
      const last = new Date(start);
      last.setDate(last.getDate() + days - 1);
      return {
        date: `${dateLabel} – ${toTitleCase(formatAgendaDateHeader(last))}`,
        time: "All day",
      };
    }
    return { date: dateLabel, time: "All day" };
  }

  const startTime = formatAgendaEventTime(interaction.scheduledAt);
  if (!interaction.durationMinutes) {
    return { date: dateLabel, time: startTime };
  }

  const end = new Date(start.getTime() + interaction.durationMinutes * 60_000);
  const endTime = formatAgendaEventTime(end.toISOString());
  const sameDay = end.toDateString() === start.toDateString();
  return {
    date: dateLabel,
    time: sameDay
      ? `${startTime} – ${endTime}`
      : `${startTime} – ${toTitleCase(formatAgendaDateHeader(end))}, ${endTime}`,
  };
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) =>
      `${space}${letter.toUpperCase()}`
    );
}

function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0 || minutes >= DAY_MINUTES) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

function resolveDetails(interaction: ScheduledInteraction) {
  const external = interaction.source !== "kinsight";
  const parsed = parseMeetingNotes(interaction.notes);

  return {
    location: interaction.location?.trim() || parsed.location,
    notes: external ? (interaction.notes?.trim() ?? "") : parsed.userNotes,
    kind: external ? null : getInteractionMeetingLabel(interaction),
  };
}

function endLocalFromInteraction(interaction: ScheduledInteraction): string {
  const start = isoToDatetimeLocal(interaction.scheduledAt);
  if (!interaction.durationMinutes) return defaultMeetingEndLocal(start);
  const end = new Date(
    new Date(interaction.scheduledAt).getTime() +
      interaction.durationMinutes * 60_000
  );
  return isoToDatetimeLocal(end.toISOString());
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 shrink-0 text-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="type-meta">{label}</p>
        <div className="mt-0.5 break-words text-sm text-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

function EventDetails({ interaction }: { interaction: ScheduledInteraction }) {
  const when = formatWhen(interaction);
  const duration = formatDuration(interaction.durationMinutes);
  const details = resolveDetails(interaction);
  const readOnly = isReadOnlyInteraction(interaction);
  const hasContactLink =
    isLinkedContactId(interaction.contactId) && interaction.contactName;
  const attendees = interaction.attendees ?? [];
  const providerLabel = calendarSourceLabel(interaction.source);
  const calendarUrl = externalCalendarUrl(interaction);

  return (
    <div className="divide-y divide-border">
      {readOnly && interaction.source !== "kinsight" ? (
        <div className="flex items-start gap-2 py-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Read-Only: Invited via {providerLabel}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Time, title, and guests can only be changed by the organizer.
            </p>
            {calendarUrl ? (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                Open in External Calendar
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <DetailRow icon={<CalendarClock className="h-4 w-4" />} label="When">
        <p>{when.date}</p>
        <p className="text-muted">
          {when.time}
          {duration ? ` · ${duration}` : ""}
        </p>
      </DetailRow>

      {hasContactLink ? (
        <DetailRow icon={<UserRound className="h-4 w-4" />} label="With">
          <Link
            href={`/contacts/${interaction.contactId}`}
            className="text-foreground underline-offset-2 hover:text-accent-green hover:underline"
          >
            {interaction.contactName}
          </Link>
        </DetailRow>
      ) : null}

      {details.location ? (
        <DetailRow icon={<MapPin className="h-4 w-4" />} label="Location">
          <p className="whitespace-pre-wrap">{details.location}</p>
        </DetailRow>
      ) : null}

      {interaction.meetingUrl ? (
        <DetailRow icon={<ExternalLink className="h-4 w-4" />} label="Join">
          <a
            href={interaction.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-accent-green underline-offset-2 hover:underline"
          >
            {interaction.meetingUrl}
          </a>
        </DetailRow>
      ) : null}

      {attendees.length > 0 ? (
        <DetailRow icon={<Users className="h-4 w-4" />} label="Guests">
          <ul className="flex flex-col gap-0.5">
            {attendees.map((guest) => (
              <li key={guest}>{guest}</li>
            ))}
          </ul>
        </DetailRow>
      ) : null}

      {details.notes ? (
        <DetailRow icon={<NotebookText className="h-4 w-4" />} label="Notes">
          <p className="whitespace-pre-wrap">{details.notes}</p>
        </DetailRow>
      ) : null}

      {interaction.behavioralTags.length > 0 ? (
        <div className="py-3">
          <ul className="flex flex-wrap gap-2" aria-label="Behavioral indicators">
            {interaction.behavioralTags.map((tag) => (
              <li key={tag}>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${behavioralTagPillClass(tag)}`}
                >
                  {formatBehavioralTagLabel(tag)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function EventEditForm({
  title,
  startAt,
  endAt,
  location,
  notes,
  disabled,
  onTitleChange,
  onStartAtChange,
  onEndAtChange,
  onLocationChange,
  onNotesChange,
}: {
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  notes: string;
  disabled: boolean;
  onTitleChange: (value: string) => void;
  onStartAtChange: (value: string) => void;
  onEndAtChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 py-3">
      <label className="flex flex-col gap-1">
        <span className="type-meta">Title</span>
        <input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          disabled={disabled}
          className="ui-input w-full px-3 py-2.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="type-meta">Starts</span>
        <input
          type="datetime-local"
          value={startAt}
          onChange={(event) => onStartAtChange(event.target.value)}
          disabled={disabled}
          className="ui-input w-full px-3 py-2.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="type-meta">Ends</span>
        <input
          type="datetime-local"
          value={endAt}
          onChange={(event) => onEndAtChange(event.target.value)}
          disabled={disabled}
          className="ui-input w-full px-3 py-2.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="type-meta">Location</span>
        <input
          type="text"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          disabled={disabled}
          className="ui-input w-full px-3 py-2.5 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="type-meta">Description</span>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          disabled={disabled}
          rows={4}
          className="ui-input w-full resize-y px-3 py-2.5 text-sm"
        />
      </label>
    </div>
  );
}

export function AgendaEventDetailsSheet({
  interactions,
  onClose,
  onApplyLocalUpdate,
}: AgendaEventDetailsSheetProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const debrief = useVoiceDebrief();

  const open = interactions !== null && interactions.length > 0;
  const identity = useMemo(
    () => interactions?.map((item) => item.id).join("|") ?? "",
    [interactions]
  );

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setEditing(false);
      return;
    }
    setFocusedId(interactions && interactions.length === 1 ? interactions[0].id : null);
    setEditing(false);
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, identity]);

  const focused =
    interactions?.find((item) => item.id === focusedId) ??
    (interactions && interactions.length === 1 ? interactions[0] : null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editing) {
        setEditing(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, editing, onClose]);

  if (!open || !interactions) return null;

  const isList = interactions.length > 1;
  const showingList = isList && !focused;
  const writable = focused ? !isReadOnlyInteraction(focused) : false;

  const heading = showingList
    ? toTitleCase(formatAgendaDateHeader(new Date(interactions[0].scheduledAt)))
    : editing
      ? "Edit Event"
      : (focused?.title ?? "");

  const beginEdit = () => {
    if (!focused || !writable) return;
    const details = resolveDetails(focused);
    setTitle(focused.title);
    setStartAt(isoToDatetimeLocal(focused.scheduledAt));
    setEndAt(endLocalFromInteraction(focused));
    setLocation(details.location);
    setNotes(details.notes);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!focused || isSaving) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showErrorToast("Enter a title.");
      return;
    }

    let scheduledAt: string;
    let scheduledEndAt: string;
    try {
      scheduledAt = datetimeLocalToIso(startAt);
      scheduledEndAt = datetimeLocalToIso(endAt);
    } catch {
      showErrorToast("Enter a valid date and time.");
      return;
    }

    if (new Date(scheduledEndAt) <= new Date(scheduledAt)) {
      showErrorToast("End time must be after the start time.");
      return;
    }

    const durationMinutes = Math.max(
      1,
      Math.round(
        (new Date(scheduledEndAt).getTime() - new Date(scheduledAt).getTime()) /
          60_000
      )
    );
    const previous = focused;
    const next: ScheduledInteraction = {
      ...focused,
      title: trimmedTitle,
      scheduledAt,
      durationMinutes,
      location: location.trim() || null,
      notes: notes.trim() || null,
    };

    onApplyLocalUpdate(next);
    setIsSaving(true);

    try {
      const res = await fetch("/api/calendar/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: focused.id,
          source: focused.source,
          externalEventId: focused.externalEventId,
          calendarId: focused.calendarId ?? null,
          title: trimmedTitle,
          scheduledAt,
          scheduledEndAt,
          location: location.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await readApiJson<{
        ok?: boolean;
        updatedIn?: string;
        error?: string;
        needsReauth?: boolean;
        interaction?: ScheduledInteraction | null;
      }>(res);

      if (!res.ok || data.error) {
        onApplyLocalUpdate(previous);
        const provider = calendarSourceLabel(focused.source);
        showErrorToast(
          data.needsReauth || res.status === 401
            ? `Couldn't update this event. Reconnect ${provider} in Settings and try again.`
            : data.error ??
                `Couldn't update this event. Reconnect ${provider} in Settings and try again.`
        );
        return;
      }

      if (data.interaction) {
        onApplyLocalUpdate(data.interaction);
      }
      showSuccessToast(
        `Event updated in ${data.updatedIn ?? calendarSourceLabel(focused.source)}.`
      );
      setEditing(false);
    } catch {
      onApplyLocalUpdate(previous);
      showErrorToast(
        `Couldn't update this event. Reconnect ${calendarSourceLabel(focused.source)} in Settings and try again.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex h-dvh items-center justify-center px-4 pb-[110px] pt-16 transition-opacity duration-200 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={showingList ? "Events on this day" : "Event details"}
    >
      <button
        type="button"
        aria-label="Close event details"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/55"
      />

      <div className="ui-card relative flex max-h-full w-full max-w-lg flex-col overflow-hidden">
        <header className="flex shrink-0 items-start gap-2 border-b border-border px-4 py-3">
          {isList && focused ? (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setFocusedId(null);
              }}
              className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-icon transition-colors hover:bg-card-hover hover:text-foreground"
              aria-label="Back to the day's events"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2} />
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            <h2 className="break-words font-sans text-base font-medium text-foreground">
              {heading}
            </h2>
            {focused ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <CalendarSourceBadge source={focused.source} />
                {resolveDetails(focused).kind ? (
                  <span className="ui-badge-green px-2.5 py-1 text-xs">
                    {resolveDetails(focused).kind}
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="type-meta mt-0.5">
                {interactions.length} events
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-icon transition-colors hover:bg-card-hover hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </header>

        <div className="contacts-scroll min-h-0 flex-1 overflow-y-auto px-4">
          {showingList ? (
            <ul className="divide-y divide-border">
              {interactions.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setFocusedId(item.id)}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <time
                      dateTime={item.scheduledAt}
                      className="w-[4.5rem] shrink-0 font-mono text-xs font-medium text-accent-orange"
                    >
                      {isAllDay(item)
                        ? "All day"
                        : formatAgendaEventTime(item.scheduledAt)}
                    </time>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">
                        {item.title}
                      </span>
                      {item.contactName ? (
                        <span className="block truncate text-xs text-muted">
                          {item.contactName}
                        </span>
                      ) : null}
                    </span>
                    <CalendarSourceBadge source={item.source} compact />
                  </button>
                </li>
              ))}
            </ul>
          ) : focused && editing ? (
            <EventEditForm
              title={title}
              startAt={startAt}
              endAt={endAt}
              location={location}
              notes={notes}
              disabled={isSaving}
              onTitleChange={setTitle}
              onStartAtChange={setStartAt}
              onEndAtChange={setEndAt}
              onLocationChange={setLocation}
              onNotesChange={setNotes}
            />
          ) : focused ? (
            <EventDetails interaction={focused} />
          ) : null}
        </div>

        {focused && !showingList ? (
          <footer className="flex shrink-0 flex-col gap-2 border-t border-border px-4 py-3">
            {editing ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={isSaving}
                  className="ui-btn-secondary flex-1 px-4 py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="ui-btn-green flex-1 px-4 py-2.5 text-sm"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={debrief.start}
                  className="ui-btn-orange flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"
                >
                  <Mic className="h-4 w-4" strokeWidth={2} />
                  Record Quick Debrief
                </button>
                {writable ? (
                  <button
                    type="button"
                    onClick={beginEdit}
                    className="ui-btn-secondary flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={2} />
                    Edit Event
                  </button>
                ) : null}
              </>
            )}
          </footer>
        ) : null}
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
        contactId={
          focused && isLinkedContactId(focused.contactId)
            ? focused.contactId
            : undefined
        }
        externalEventId={focused?.externalEventId}
        provider={focused?.source}
        eventTitle={focused?.title}
        calendarEventId={
          focused && isLinkedContactId(focused.id) ? focused.id : undefined
        }
        onClose={debrief.close}
      />
    </div>
  );
}
