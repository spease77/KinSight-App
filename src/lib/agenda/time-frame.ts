import type { AgendaTimeFrame } from "@/types/scheduled-interaction";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";

export type AgendaDateGroup = {
  dateKey: string;
  label: string;
  items: ScheduledInteraction[];
};

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function getAgendaTimeFrameBounds(
  timeFrame: AgendaTimeFrame,
  reference = new Date()
): { start: Date; end: Date } {
  const start = startOfDay(reference);

  if (timeFrame === "day") {
    return { start, end: endOfDay(reference) };
  }

  if (timeFrame === "week") {
    const end = endOfDay(reference);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }

  const end = endOfDay(reference);
  end.setMonth(end.getMonth() + 1, 0);
  return { start, end };
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatAgendaDateHeader(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
    .format(date)
    .toUpperCase();
}

export function formatAgendaEventTime(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function filterInteractionsForTimeFrame(
  interactions: ScheduledInteraction[],
  timeFrame: AgendaTimeFrame,
  reference = new Date()
): ScheduledInteraction[] {
  const { start, end } = getAgendaTimeFrameBounds(timeFrame, reference);
  const now = reference.getTime();

  return interactions
    .filter((item) => {
      const scheduled = new Date(item.scheduledAt);
      const time = scheduled.getTime();
      if (time < start.getTime() || time > end.getTime()) {
        return false;
      }

      if (timeFrame === "day") {
        return isSameCalendarDay(scheduled, reference);
      }

      return time >= now;
    })
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
}

export function groupInteractionsByDate(
  interactions: ScheduledInteraction[]
): AgendaDateGroup[] {
  const groups = new Map<string, AgendaDateGroup>();

  for (const item of interactions) {
    const date = new Date(item.scheduledAt);
    const dateKey = toDateKey(date);
    const existing = groups.get(dateKey);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(dateKey, {
      dateKey,
      label: formatAgendaDateHeader(date),
      items: [item],
    });
  }

  return Array.from(groups.values());
}
