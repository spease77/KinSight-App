export const AGENDA_MEETING_TYPES = [
  "call",
  "coffee",
  "zoom",
  "in_person",
  "reminder",
] as const;

export type AgendaMeetingType = (typeof AGENDA_MEETING_TYPES)[number];

export const AGENDA_MEETING_TYPE_OPTIONS: {
  value: AgendaMeetingType;
  label: string;
}[] = [
  { value: "call", label: "Call" },
  { value: "coffee", label: "Coffee" },
  { value: "zoom", label: "Zoom" },
  { value: "in_person", label: "In-Person" },
  { value: "reminder", label: "Reminder" },
];

export const MEETING_FORMAT_SEGMENTS = [
  { value: "in_person" as const, label: "In Person" },
  { value: "call" as const, label: "Phone" },
  { value: "zoom" as const, label: "Video Call" },
  { value: "reminder" as const, label: "Reminder" },
] as const;

export type MeetingFormatSegment = (typeof MEETING_FORMAT_SEGMENTS)[number]["value"];

export const DEFAULT_MEETING_FORMAT: MeetingFormatSegment = "call";

export const DEFAULT_AGENDA_MEETING_TYPE: AgendaMeetingType = DEFAULT_MEETING_FORMAT;

export function buildAgendaMeetingTitle(
  contactName: string,
  meetingType: AgendaMeetingType
): string {
  if (meetingType === "reminder") {
    return `Reminder for ${contactName}`;
  }

  const label =
    AGENDA_MEETING_TYPE_OPTIONS.find((option) => option.value === meetingType)
      ?.label ?? "Meeting";

  return `${label} with ${contactName}`;
}

export function composeMeetingNotes(
  meetingType: AgendaMeetingType,
  userNotes: string,
  location?: string
): string | null {
  const trimmedNotes = userNotes.trim();
  const trimmedLocation = location?.trim() ?? "";
  const typeLine = `Format: ${
    AGENDA_MEETING_TYPE_OPTIONS.find((option) => option.value === meetingType)
      ?.label ?? meetingType
  }`;

  const lines = [typeLine];
  if (trimmedLocation) {
    lines.push(`Location: ${trimmedLocation}`);
  }
  if (trimmedNotes) {
    lines.push("", trimmedNotes);
  }

  return lines.join("\n").trim() || null;
}
