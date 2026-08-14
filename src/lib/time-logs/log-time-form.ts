import {
  MEETING_FORMAT_SEGMENTS,
  type MeetingFormatSegment,
} from "@/types/agenda-meeting";
import type { MeetingFormat } from "@/types/time-log";

export function meetingFormatFromSegment(
  segment: MeetingFormatSegment
): MeetingFormat {
  switch (segment) {
    case "in_person":
      return "in_person";
    case "call":
      return "phone";
    case "zoom":
      return "video_call";
    case "reminder":
      return "reminder";
  }
}

export function resolveDurationMinutesFromRange(
  startAt: string,
  endAt: string
): number | null {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) {
    return null;
  }

  return Math.round(diffMs / 60_000);
}

export function resolveDurationMinutesFromParts(
  durationHours: string,
  durationMinutes: string
): number | null {
  const hours = durationHours.trim() === "" ? 0 : Number(durationHours);
  const minutes = durationMinutes.trim() === "" ? 0 : Number(durationMinutes);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    minutes < 0 ||
    minutes >= 60
  ) {
    return null;
  }

  const total = Math.round(hours * 60 + minutes);
  return total > 0 ? total : null;
}

export function composeLogTimeNotes({
  title,
  location,
  meetingFormat,
  userNotes,
}: {
  title: string;
  location: string;
  meetingFormat: MeetingFormatSegment;
  userNotes: string;
}): string | null {
  const trimmedTitle = title.trim();
  const trimmedLocation = location.trim();
  const trimmedNotes = userNotes.trim();
  const formatLabel =
    MEETING_FORMAT_SEGMENTS.find((segment) => segment.value === meetingFormat)
      ?.label ?? meetingFormat;

  const lines: string[] = [];
  if (trimmedTitle) lines.push(`Title: ${trimmedTitle}`);
  lines.push(`Format: ${formatLabel}`);
  if (trimmedLocation) lines.push(`Location: ${trimmedLocation}`);
  if (trimmedNotes) {
    if (lines.length > 0) lines.push("");
    lines.push(trimmedNotes);
  }

  return lines.join("\n").trim() || null;
}
