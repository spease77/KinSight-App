import type { BehavioralProfileTag } from "@/lib/psychological-profile";
import type { ContactType } from "@/lib/contacts/contact-type";

export type AgendaTimeFrame = "day" | "week" | "month";

export const AGENDA_TIME_FRAME_OPTIONS: {
  value: AgendaTimeFrame;
  label: string;
}[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export const DEFAULT_AGENDA_TIME_FRAME: AgendaTimeFrame = "week";

export const INTERACTION_SOURCES = ["kinsight", "google", "outlook"] as const;

export type InteractionSource = (typeof INTERACTION_SOURCES)[number];

export const INTERACTION_SOURCE_LABELS: Record<InteractionSource, string> = {
  kinsight: "KinSight",
  google: "Google Calendar",
  outlook: "Outlook",
};

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
};
