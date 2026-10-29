import type { BehavioralProfileTag } from "@/lib/psychological-profile";
import type { ContactType } from "@/lib/contacts/contact-type";
import type { CalendarSyncStatus } from "@/types/calendar-event";

export type AgendaTimeFrame = "day" | "week" | "month" | "list";

export const AGENDA_TIME_FRAME_OPTIONS: {
  value: AgendaTimeFrame;
  label: string;
}[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "list", label: "List" },
];

export const DEFAULT_AGENDA_TIME_FRAME: AgendaTimeFrame = "week";

export const INTERACTION_SOURCES = ["kinsight", "google", "outlook"] as const;

export type InteractionSource = (typeof INTERACTION_SOURCES)[number];

export const INTERACTION_SOURCE_LABELS: Record<InteractionSource, string> = {
  kinsight: "KinSight",
  google: "Google Calendar",
  outlook: "Outlook",
};

const CONTACT_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLinkedContactId(contactId: string | null | undefined): boolean {
  return Boolean(contactId && CONTACT_UUID.test(contactId));
}

/** Demo rows and live Google/Outlook events are not KinSight-native meetings. */
export function isExternalCalendarEvent(
  interaction: Pick<ScheduledInteraction, "contactId" | "id" | "source">
): boolean {
  if (interaction.source === "google" || interaction.source === "outlook") {
    return true;
  }
  return (
    interaction.contactId.startsWith("mock-") ||
    interaction.contactId.startsWith("google-") ||
    interaction.contactId.startsWith("outlook-") ||
    interaction.id.startsWith("google-") ||
    interaction.id.startsWith("outlook-") ||
    interaction.id.startsWith("mock-")
  );
}

/**
 * Locked when the provider marked the event read-only, or the user is not
 * the organizer. Mock demo rows are always locked.
 */
export function isReadOnlyInteraction(
  interaction: Pick<
    ScheduledInteraction,
    "contactId" | "isReadOnly" | "isOrganizer"
  >
): boolean {
  if (interaction.contactId.startsWith("mock-")) return true;
  if (interaction.isReadOnly === true) return true;
  if (interaction.isOrganizer === false) return true;
  return false;
}

export function calendarSourceLabel(
  source: InteractionSource
): "Google Calendar" | "Outlook" | "KinSight" {
  if (source === "google") return "Google Calendar";
  if (source === "outlook") return "Outlook";
  return "KinSight";
}

export function externalCalendarUrl(
  interaction: Pick<ScheduledInteraction, "source" | "htmlLink">
): string | null {
  if (interaction.htmlLink?.trim()) return interaction.htmlLink.trim();
  if (interaction.source === "google") {
    return "https://calendar.google.com/calendar/u/0/r";
  }
  if (interaction.source === "outlook") {
    return "https://outlook.live.com/calendar/";
  }
  return null;
}

export type ScheduledInteraction = {
  id: string;
  contactId: string;
  contactName: string;
  contactType: ContactType | null;
  scheduledAt: string;
  title: string;
  durationMinutes: number | null;
  behavioralTags: BehavioralProfileTag[];
  notes: string | null;
  source: InteractionSource;
  externalEventId: string | null;
  lastSyncedAt: string | null;
  calendarId?: string | null;
  isOrganizer?: boolean;
  isReadOnly?: boolean;
  syncStatus?: CalendarSyncStatus;
  /** Filled for events read from an external calendar. */
  location?: string | null;
  attendees?: string[];
  meetingUrl?: string | null;
  /** Provider page for this event (Google htmlLink / Outlook webLink). */
  htmlLink?: string | null;
};
