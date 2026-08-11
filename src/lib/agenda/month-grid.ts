import type { ScheduledInteraction } from "@/types/scheduled-interaction";
import { toDateKey } from "@/lib/agenda/hourly-grid";

export const MONTH_WEEKDAY_LABELS = [
  "Su",
  "Mo",
  "Tu",
  "We",
  "Th",
  "Fr",
  "Sa",
] as const;

export const MONTH_GRID_WEEKS = 6;
export const MONTH_GRID_DAYS = MONTH_GRID_WEEKS * 7;

export type AgendaMonthCell = {
  date: Date;
  dateKey: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  weekIndex: number;
  dayIndex: number;
};

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function formatAgendaMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function getCalendarMonthGrid(reference: Date): AgendaMonthCell[] {
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);

  const year = ref.getFullYear();
  const month = ref.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  const todayKey = toDateKey(startOfToday());
  const cells: AgendaMonthCell[] = [];

  for (let index = 0; index < MONTH_GRID_DAYS; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = toDateKey(date);

    cells.push({
      date,
      dateKey,
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: dateKey === todayKey,
      weekIndex: Math.floor(index / 7),
      dayIndex: index % 7,
    });
  }

  return cells;
}

export function shiftSelectedMonth(
  date: Date,
  direction: -1 | 1
): Date {
  const day = date.getDate();
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + direction);

  const lastDayOfMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0
  ).getDate();
  next.setDate(Math.min(day, lastDayOfMonth));
  next.setHours(0, 0, 0, 0);
  return next;
}

export function interactionsByDateKey(
  interactions: ScheduledInteraction[]
): Map<string, ScheduledInteraction[]> {
  const map = new Map<string, ScheduledInteraction[]>();

  for (const item of interactions) {
    const key = toDateKey(new Date(item.scheduledAt));
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }

  for (const [key, items] of map) {
    map.set(
      key,
      items.sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )
    );
  }

  return map;
}

export function interactionsForMonth(
  interactions: ScheduledInteraction[],
  reference: Date
): ScheduledInteraction[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();

  return interactions
    .filter((item) => {
      const scheduled = new Date(item.scheduledAt);
      return scheduled.getFullYear() === year && scheduled.getMonth() === month;
    })
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
}
