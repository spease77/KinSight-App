import {
  AGENDA_MEETING_TYPE_OPTIONS,
  parseMeetingNotes,
} from "@/types/agenda-meeting";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";

export type AgendaListSortField = "date" | "time" | "label";
export type AgendaListSortDirection = "asc" | "desc";

export const AGENDA_LIST_SORT_FIELDS: {
  value: AgendaListSortField;
  label: string;
}[] = [
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "label", label: "Label" },
];

export function getInteractionMeetingLabel(
  interaction: ScheduledInteraction
): string {
  const { meetingFormat } = parseMeetingNotes(interaction.notes);
  return (
    AGENDA_MEETING_TYPE_OPTIONS.find((option) => option.value === meetingFormat)
      ?.label ?? "Meeting"
  );
}

function timeOfDayMs(iso: string): number {
  const date = new Date(iso);
  return (
    date.getHours() * 3_600_000 +
    date.getMinutes() * 60_000 +
    date.getSeconds() * 1_000 +
    date.getMilliseconds()
  );
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function toggleAgendaListSortDirection(
  direction: AgendaListSortDirection
): AgendaListSortDirection {
  return direction === "asc" ? "desc" : "asc";
}

export function sortAgendaInteractions(
  interactions: ScheduledInteraction[],
  sortBy: AgendaListSortField,
  direction: AgendaListSortDirection
): ScheduledInteraction[] {
  const sorted = [...interactions].sort((a, b) => {
    if (sortBy === "date") {
      const dateCompare =
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      if (dateCompare !== 0) return dateCompare;
      return compareStrings(a.title, b.title);
    }

    if (sortBy === "time") {
      const timeCompare =
        timeOfDayMs(a.scheduledAt) - timeOfDayMs(b.scheduledAt);
      if (timeCompare !== 0) return timeCompare;
      return (
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    }

    const labelCompare = compareStrings(
      getInteractionMeetingLabel(a),
      getInteractionMeetingLabel(b)
    );
    if (labelCompare !== 0) return labelCompare;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  return direction === "desc" ? sorted.reverse() : sorted;
}
