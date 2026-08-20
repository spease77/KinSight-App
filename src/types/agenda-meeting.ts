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

export function parseMeetingNotes(notes: string | null): {
  meetingFormat: MeetingFormatSegment;
  location: string;
  userNotes: string;
} {
  if (!notes?.trim()) {
    return {
      meetingFormat: DEFAULT_MEETING_FORMAT,
      location: "",
      userNotes: "",
    };
  }

  const lines = notes.split("\n");
  let meetingFormat: MeetingFormatSegment = DEFAULT_MEETING_FORMAT;
  let location = "";
  const userNoteLines: string[] = [];
  let reachedUserNotes = false;

  for (const line of lines) {
    if (!reachedUserNotes && line.startsWith("Format: ")) {
      const label = line.slice("Format: ".length).trim();
      const match = AGENDA_MEETING_TYPE_OPTIONS.find(
        (option) => option.label === label
      );
      if (match && isMeetingFormatSegment(match.value)) {
        meetingFormat = match.value;
      }
      continue;
    }

    if (!reachedUserNotes && line.startsWith("Location: ")) {
      location = line.slice("Location: ".length).trim();
      continue;
    }

    if (!reachedUserNotes && line === "") {
      reachedUserNotes = true;
      continue;
    }

    userNoteLines.push(line);
  }

  return {
    meetingFormat,
    location,
    userNotes: userNoteLines.join("\n").trim(),
  };
}

function isMeetingFormatSegment(
  value: AgendaMeetingType
): value is MeetingFormatSegment {
  return MEETING_FORMAT_SEGMENTS.some((segment) => segment.value === value);
}
