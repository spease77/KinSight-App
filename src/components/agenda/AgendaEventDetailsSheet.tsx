"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  MapPin,
  NotebookText,
  Pencil,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  behavioralTagPillClass,
  formatBehavioralTagLabel,
} from "@/lib/psychological-profile";
import { getInteractionMeetingLabel } from "@/lib/agenda/sort-interactions";
import {
  formatAgendaDateHeader,
  formatAgendaEventTime,
} from "@/lib/agenda/time-frame";
import { parseMeetingNotes } from "@/types/agenda-meeting";
import {
  INTERACTION_SOURCE_LABELS,
  isReadOnlyInteraction,
  type ScheduledInteraction,
} from "@/types/scheduled-interaction";

interface AgendaEventDetailsSheetProps {
  /** One event, or every event on a tapped day (month view). */
  interactions: ScheduledInteraction[] | null;
  onClose: () => void;
  onEdit: (interaction: ScheduledInteraction) => void;
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
  const hasContactLink = !readOnly && interaction.contactName;
  const attendees = interaction.attendees ?? [];

  return (
    <div className="divide-y divide-border">
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

export function AgendaEventDetailsSheet({
  interactions,
  onClose,
  onEdit,
}: AgendaEventDetailsSheetProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  const open = interactions !== null && interactions.length > 0;
  const identity = useMemo(
    () => interactions?.map((item) => item.id).join("|") ?? "",
    [interactions]
  );

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    setFocusedId(interactions && interactions.length === 1 ? interactions[0].id : null);
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, identity]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !interactions) return null;

  const isList = interactions.length > 1;
  const focused =
    interactions.find((item) => item.id === focusedId) ??
    (interactions.length === 1 ? interactions[0] : null);
  const showingList = isList && !focused;

  const title = showingList
    ? toTitleCase(formatAgendaDateHeader(new Date(interactions[0].scheduledAt)))
    : (focused?.title ?? "");

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
              onClick={() => setFocusedId(null)}
              className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-icon transition-colors hover:bg-card-hover hover:text-foreground"
              aria-label="Back to the day's events"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2} />
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            <h2 className="break-words font-sans text-base font-medium text-foreground">
              {title}
            </h2>
            {focused ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {resolveDetails(focused).kind ? (
                  <span className="ui-badge-green px-2.5 py-1 text-xs">
                    {resolveDetails(focused).kind}
                  </span>
                ) : null}
                {focused.source !== "kinsight" ? (
                  <span className="rounded-full border border-border-green/50 bg-elevated px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                    {INTERACTION_SOURCE_LABELS[focused.source]}
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
                  </button>
                </li>
              ))}
            </ul>
          ) : focused ? (
            <EventDetails interaction={focused} />
          ) : null}
        </div>

        {focused && !isReadOnlyInteraction(focused) ? (
          <footer className="shrink-0 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => onEdit(focused)}
              className="ui-btn-secondary flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"
            >
              <Pencil className="h-4 w-4" strokeWidth={2} />
              Edit meeting
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
