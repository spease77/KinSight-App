import type { BehavioralProfileTag } from "@/lib/psychological-profile";
import type { ContactType } from "@/lib/contacts/contact-type";

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

/** Demo rows and events read from Google Calendar have no KinSight contact to open or edit. */
export function isReadOnlyInteraction(
  interaction: Pick<ScheduledInteraction, "contactId">
): boolean {
  return (
    interaction.contactId.startsWith("mock-") ||
    interaction.contactId.startsWith("google-")
  );
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
  /** Filled for events read from an external calendar. */
  location?: string | null;
  attendees?: string[];
  meetingUrl?: string | null;
};
