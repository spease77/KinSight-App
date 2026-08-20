import type { ContactType } from "@/lib/contacts/contact-type";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";
import { isSameCalendarDay } from "@/lib/agenda/time-frame";

export const AGENDA_TIME_GUTTER_WIDTH = "48px";
export const AGENDA_WEEK_VISIBLE_DAY_COUNT = 7;
export const AGENDA_WEEK_HORIZONTAL_SNAP_COUNT = 3;

/** Seven day columns inside a viewport that shows five days at a time. */
export const AGENDA_WEEK_DAYS_TRACK_WIDTH = `calc(100% * 7 / ${AGENDA_WEEK_VISIBLE_DAY_COUNT})`;

export const AGENDA_GRID_START_HOUR = 0;
export const AGENDA_GRID_END_HOUR = 24;
export const AGENDA_DAY_DEFAULT_START_HOUR = 8;
export const AGENDA_DAY_DEFAULT_END_HOUR = 17;
export const AGENDA_GRID_SLOT_MINUTES = 30;
export const AGENDA_GRID_SLOT_HEIGHT_PX = 36;
export const AGENDA_GRID_DEFAULT_DURATION_MINUTES = 30;
export const AGENDA_DEFAULT_EMPTY_SCROLL_HOUR = AGENDA_DAY_DEFAULT_START_HOUR;
export const AGENDA_GRID_SCROLL_PADDING_PX = 12;
/** Visible vertical window in the week time grid (4 hours). */
export const AGENDA_WEEK_VIEWPORT_HOURS = 4;
export const AGENDA_WEEK_VIEWPORT_SLOT_COUNT =
  (AGENDA_WEEK_VIEWPORT_HOURS * 60) / AGENDA_GRID_SLOT_MINUTES;
export const AGENDA_WEEK_VIEWPORT_HEIGHT_PX =
  AGENDA_WEEK_VIEWPORT_SLOT_COUNT * AGENDA_GRID_SLOT_HEIGHT_PX;

export type AgendaGridTimeRange = {
  startMinutes: number;
  endMinutes: number;
};

export type AgendaGridSlot = {
  index: number;
  minutesFromMidnight: number;
  label: string;
};

export type AgendaGridEventLayout = {
  interaction: ScheduledInteraction;
  topPx: number;
  heightPx: number;
};

export type AgendaWeekDay = {
  date: Date;
  dateKey: string;
  dayIndex: number;
  label: string;
};

export type AgendaWeekGridEventLayout = AgendaGridEventLayout & {
  dayIndex: number;
};

export const WEEK_DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function getGridTimeBounds(range?: AgendaGridTimeRange): AgendaGridTimeRange {
  return {
    startMinutes: range?.startMinutes ?? AGENDA_GRID_START_HOUR * 60,
    endMinutes: range?.endMinutes ?? AGENDA_GRID_END_HOUR * 60,
  };
}

export function getDayGridTimeRange(
  _dayInteractions: ScheduledInteraction[] = []
): AgendaGridTimeRange {
  return {
    startMinutes: AGENDA_GRID_START_HOUR * 60,
    endMinutes: AGENDA_GRID_END_HOUR * 60,
  };
}

export function buildAgendaGridSlots(
  range?: AgendaGridTimeRange
): AgendaGridSlot[] {
  const slots: AgendaGridSlot[] = [];
  const { startMinutes, endMinutes } = getGridTimeBounds(range);

  for (
    let minutes = startMinutes;
    minutes <= endMinutes;
    minutes += AGENDA_GRID_SLOT_MINUTES
  ) {
    slots.push({
      index: slots.length,
      minutesFromMidnight: minutes,
      label: formatGridSlotLabel(minutes),
    });
  }

  return slots;
}

export function formatGridSlotLabel(minutesFromMidnight: number): string {
  const normalizedMinutes =
    minutesFromMidnight >= 24 * 60 ? 0 : minutesFromMidnight;
  const minutes = normalizedMinutes % 60;

  if (minutes !== 0) {
    return "";
  }

  const hours = Math.floor(normalizedMinutes / 60) % 24;
  if (hours === 0) return "12am";
  if (hours === 12) return "12pm";
  if (hours < 12) return `${hours}am`;
  return `${hours - 12}pm`;
}

export function formatAgendaSelectedDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function interactionsForDate(
  interactions: ScheduledInteraction[],
  date: Date
): ScheduledInteraction[] {
  return interactions
    .filter((item) => isSameCalendarDay(new Date(item.scheduledAt), date))
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
}

export function layoutGridEvents(
  interactions: ScheduledInteraction[],
  range?: AgendaGridTimeRange
): AgendaGridEventLayout[] {
  const { startMinutes: gridStart, endMinutes: gridEnd } =
    getGridTimeBounds(range);
  const slotHeight = AGENDA_GRID_SLOT_HEIGHT_PX;
  const slotMinutes = AGENDA_GRID_SLOT_MINUTES;

  return interactions
    .map((interaction) => {
      const scheduled = new Date(interaction.scheduledAt);
      const eventStart =
        scheduled.getHours() * 60 + scheduled.getMinutes();
      const duration =
        interaction.durationMinutes ?? AGENDA_GRID_DEFAULT_DURATION_MINUTES;

      if (eventStart < gridStart || eventStart > gridEnd) {
        return null;
      }

      const topPx = ((eventStart - gridStart) / slotMinutes) * slotHeight;
      const heightPx = Math.max(
        slotHeight,
        (duration / slotMinutes) * slotHeight
      );

      return {
        interaction,
        topPx,
        heightPx,
      };
    })
    .filter((item): item is AgendaGridEventLayout => item !== null);
}

export function formatAgendaWeekRange(weekDays: AgendaWeekDay[]): string {
  if (weekDays.length === 0) return "";

  const start = weekDays[0].date;
  const end = weekDays[weekDays.length - 1].date;
  const sameMonth = start.getMonth() === end.getMonth();

  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(start);

  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: sameMonth ? undefined : "long",
    day: "numeric",
  }).format(end);

  return sameMonth ? `${startLabel} – ${endLabel}` : `${startLabel} – ${endLabel}`;
}

export function getCalendarWeekDays(reference: Date): AgendaWeekDay[] {
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);

  const sunday = new Date(ref);
  sunday.setDate(ref.getDate() - ref.getDay());

  return WEEK_DAY_LABELS.map((label, dayIndex) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + dayIndex);

    return {
      date,
      dateKey: toDateKey(date),
      dayIndex,
      label,
    };
  });
}

export function interactionsForWeek(
  interactions: ScheduledInteraction[],
  weekDays: AgendaWeekDay[]
): ScheduledInteraction[] {
  const dateKeys = new Set(weekDays.map((day) => day.dateKey));

  return interactions
    .filter((item) => dateKeys.has(toDateKey(new Date(item.scheduledAt))))
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
}

export function getMinutesFromMidnightForInteraction(
  interaction: ScheduledInteraction
): number {
  const scheduled = new Date(interaction.scheduledAt);
  return scheduled.getHours() * 60 + scheduled.getMinutes();
}

/** Pixel offset from the top of the grid body for a given clock time. */
export function agendaGridScrollTopForMinutes(
  minutesFromMidnight: number,
  range?: AgendaGridTimeRange
): number {
  const { startMinutes: gridStart, endMinutes: gridEnd } =
    getGridTimeBounds(range);
  const clamped = Math.max(gridStart, Math.min(minutesFromMidnight, gridEnd));

  return (
    ((clamped - gridStart) / AGENDA_GRID_SLOT_MINUTES) *
    AGENDA_GRID_SLOT_HEIGHT_PX
  );
}

export function agendaGridScrollTopForHour(hour: number): number {
  return agendaGridScrollTopForMinutes(hour * 60);
}

export function snapMinutesToGridSlot(
  minutesFromMidnight: number,
  range?: AgendaGridTimeRange
): number {
  const { startMinutes: gridStart, endMinutes: gridEnd } =
    getGridTimeBounds(range);
  const clamped = Math.max(gridStart, Math.min(minutesFromMidnight, gridEnd));
  const slotIndex = Math.floor(
    (clamped - gridStart) / AGENDA_GRID_SLOT_MINUTES
  );

  return gridStart + slotIndex * AGENDA_GRID_SLOT_MINUTES;
}

export function getFallbackWeekScrollMinutes(
  reference = new Date()
): number {
  const nowMinutes = reference.getHours() * 60 + reference.getMinutes();
  const gridStart = AGENDA_GRID_START_HOUR * 60;
  const gridEnd = AGENDA_GRID_END_HOUR * 60;

  if (nowMinutes >= gridStart && nowMinutes <= gridEnd) {
    return snapMinutesToGridSlot(nowMinutes);
  }

  return AGENDA_DEFAULT_EMPTY_SCROLL_HOUR * 60;
}

export function getWeekScrollTargetMinutes(
  weekInteractions: ScheduledInteraction[],
  reference = new Date()
): number {
  if (weekInteractions.length === 0) {
    return getFallbackWeekScrollMinutes(reference);
  }

  return snapMinutesToGridSlot(
    getMinutesFromMidnightForInteraction(weekInteractions[0])
  );
}

export function clampAgendaGridScrollTop(
  scrollTop: number,
  container: HTMLElement
): number {
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
  return Math.max(0, Math.min(scrollTop, maxScroll));
}

export function getElementScrollTopWithinContainer(
  element: HTMLElement,
  scrollContainer: HTMLElement
): number {
  const containerRect = scrollContainer.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  return scrollContainer.scrollTop + (elementRect.top - containerRect.top);
}

export function getDayScrollTargetMinutes(
  dayInteractions: ScheduledInteraction[],
  range?: AgendaGridTimeRange
): number {
  if (dayInteractions.length === 0) {
    return AGENDA_DEFAULT_EMPTY_SCROLL_HOUR * 60;
  }

  return snapMinutesToGridSlot(
    getMinutesFromMidnightForInteraction(dayInteractions[0]),
    range
  );
}

export function getDayVerticalScrollTop(
  scrollContainer: HTMLElement,
  _dayInteractions: ScheduledInteraction[] = [],
  range?: AgendaGridTimeRange
): number {
  return clampAgendaGridScrollTop(
    agendaGridScrollTopForMinutes(AGENDA_DEFAULT_EMPTY_SCROLL_HOUR * 60, range),
    scrollContainer
  );
}

export function snapAgendaGridVerticalScroll(
  scrollContainer: HTMLElement,
  behavior: ScrollBehavior = "smooth"
): void {
  const slotHeight = AGENDA_GRID_SLOT_HEIGHT_PX;
  const snapIndex = Math.round(scrollContainer.scrollTop / slotHeight);
  const maxSnap = Math.max(
    0,
    Math.ceil(
      (scrollContainer.scrollHeight - scrollContainer.clientHeight) / slotHeight
    )
  );
  const clampedIndex = Math.max(0, Math.min(maxSnap, snapIndex));

  scrollContainer.scrollTo({
    top: clampedIndex * slotHeight,
    behavior,
  });
}

function scrollAgendaGridToMinutes(input: {
  scrollContainer: HTMLElement;
  targetMinutes: number;
  paddingPx?: number;
  behavior?: ScrollBehavior;
}): boolean {
  const {
    scrollContainer,
    targetMinutes,
    paddingPx = AGENDA_GRID_SCROLL_PADDING_PX,
    behavior = "smooth",
  } = input;

  const slotElement = scrollContainer.querySelector<HTMLElement>(
    `[data-agenda-slot-minutes="${targetMinutes}"]`
  );

  const rawTop = slotElement
    ? getElementScrollTopWithinContainer(slotElement, scrollContainer)
    : agendaGridScrollTopForMinutes(targetMinutes);

  const boundedTop = clampAgendaGridScrollTop(
    rawTop - paddingPx,
    scrollContainer
  );

  scrollContainer.scrollTo({ top: boundedTop, behavior });
  return true;
}

export function scrollDayGridToTarget(input: {
  scrollContainer: HTMLElement;
  dayInteractions: ScheduledInteraction[];
  range?: AgendaGridTimeRange;
  behavior?: ScrollBehavior;
}): boolean {
  const { scrollContainer, dayInteractions, range, behavior = "auto" } = input;

  scrollContainer.scrollTo({
    top: getDayVerticalScrollTop(scrollContainer, dayInteractions, range),
    behavior,
  });

  return true;
}

export function getWeekHorizontalSnapIndex(
  weekInteractions: ScheduledInteraction[],
  weekDays: AgendaWeekDay[],
  selectedDateKey?: string
): 0 | 1 | 2 {
  const selectedDay = selectedDateKey
    ? weekDays.find((day) => day.dateKey === selectedDateKey)
    : undefined;

  if (selectedDay) {
    if (selectedDay.dayIndex === 0) return 0;
    if (selectedDay.dayIndex === 6) return 2;
    if (selectedDay.dayIndex >= 1 && selectedDay.dayIndex <= 5) return 1;
  }

  if (weekInteractions.length === 0) return 1;

  const dayIndices = weekInteractions
    .map((item) => {
      const dateKey = toDateKey(new Date(item.scheduledAt));
      return weekDays.find((day) => day.dateKey === dateKey)?.dayIndex;
    })
    .filter((index): index is number => index !== undefined);

  if (dayIndices.length === 0) return 1;

  const minIndex = Math.min(...dayIndices);
  const maxIndex = Math.max(...dayIndices);
  const hasWeekday = dayIndices.some((index) => index >= 1 && index <= 5);

  if (!hasWeekday && minIndex === 0) return 0;
  if (!hasWeekday && maxIndex === 6) return 2;

  if (maxIndex <= 3) return 0;
  if (minIndex >= 3) return 2;
  return 1;
}

export function getWeekHorizontalScrollLeft(
  scrollContainer: HTMLElement,
  snapIndex: 0 | 1 | 2
): number {
  const columnWidth =
    scrollContainer.clientWidth / AGENDA_WEEK_VISIBLE_DAY_COUNT;
  return snapIndex * columnWidth;
}

export function getWeekVerticalScrollTop(
  scrollContainer: HTMLElement,
  _weekInteractions: ScheduledInteraction[] = [],
  _reference = new Date()
): number {
  return clampAgendaGridScrollTop(
    agendaGridScrollTopForMinutes(AGENDA_DEFAULT_EMPTY_SCROLL_HOUR * 60),
    scrollContainer
  );
}

export function scrollWeekVerticalToTarget(input: {
  scrollContainer: HTMLElement;
  weekInteractions: ScheduledInteraction[];
  reference?: Date;
  behavior?: ScrollBehavior;
}): void {
  const {
    scrollContainer,
    weekInteractions,
    reference,
    behavior = "auto",
  } = input;

  scrollContainer.scrollTo({
    top: getWeekVerticalScrollTop(scrollContainer, weekInteractions, reference),
    behavior,
  });
}

export function syncWeekHorizontalScroll(
  source: HTMLElement,
  targets: HTMLElement[]
): void {
  for (const target of targets) {
    if (target !== source && target.scrollLeft !== source.scrollLeft) {
      target.scrollLeft = source.scrollLeft;
    }
  }
}

export function scrollWeekGridHorizontalToSnap(input: {
  scrollContainer: HTMLElement | HTMLElement[];
  snapIndex: 0 | 1 | 2;
  behavior?: ScrollBehavior;
}): void {
  const { snapIndex, behavior = "auto" } = input;
  const containers = Array.isArray(input.scrollContainer)
    ? input.scrollContainer
    : [input.scrollContainer];

  for (const scrollContainer of containers) {
    scrollContainer.scrollTo({
      left: getWeekHorizontalScrollLeft(scrollContainer, snapIndex),
      behavior,
    });
  }
}

export function snapWeekGridHorizontalScroll(
  scrollContainer: HTMLElement | HTMLElement[],
  behavior: ScrollBehavior = "smooth"
): 0 | 1 | 2 {
  const containers = Array.isArray(scrollContainer)
    ? scrollContainer
    : [scrollContainer];
  const primary = containers[0];
  const columnWidth =
    primary.clientWidth / AGENDA_WEEK_VISIBLE_DAY_COUNT;
  const rawIndex = Math.round(primary.scrollLeft / columnWidth);
  const snapIndex = Math.max(
    0,
    Math.min(AGENDA_WEEK_HORIZONTAL_SNAP_COUNT - 1, rawIndex)
  ) as 0 | 1 | 2;

  scrollWeekGridHorizontalToSnap({
    scrollContainer: containers,
    snapIndex,
    behavior,
  });

  return snapIndex;
}

export function scrollWeekGridToInitialPosition(input: {
  verticalScrollContainer: HTMLElement;
  horizontalScrollContainers: HTMLElement[];
  weekInteractions: ScheduledInteraction[];
  weekDays: AgendaWeekDay[];
  selectedDateKey?: string;
  reference?: Date;
  verticalBehavior?: ScrollBehavior;
}): void {
  const {
    verticalScrollContainer,
    horizontalScrollContainers,
    weekInteractions,
    weekDays,
    selectedDateKey,
    reference,
    verticalBehavior = "auto",
  } = input;

  const snapIndex = getWeekHorizontalSnapIndex(
    weekInteractions,
    weekDays,
    selectedDateKey
  );

  scrollWeekGridHorizontalToSnap({
    scrollContainer: horizontalScrollContainers,
    snapIndex,
    behavior: "auto",
  });

  scrollWeekVerticalToTarget({
    scrollContainer: verticalScrollContainer,
    weekInteractions,
    reference,
    behavior: verticalBehavior,
  });
}

export function scrollWeekGridToTarget(input: {
  scrollContainer: HTMLElement;
  weekInteractions: ScheduledInteraction[];
  reference?: Date;
  paddingPx?: number;
  behavior?: ScrollBehavior;
}): boolean {
  const {
    scrollContainer,
    weekInteractions,
    reference = new Date(),
    paddingPx,
    behavior,
  } = input;

  return scrollAgendaGridToMinutes({
    scrollContainer,
    targetMinutes: getWeekScrollTargetMinutes(weekInteractions, reference),
    paddingPx,
    behavior,
  });
}

export function getWeekGridScrollTop(
  weekInteractions: ScheduledInteraction[],
  reference = new Date()
): number {
  return agendaGridScrollTopForMinutes(
    getWeekScrollTargetMinutes(weekInteractions, reference)
  );
}

export function layoutWeekGridEvents(
  interactions: ScheduledInteraction[],
  weekDays: AgendaWeekDay[]
): AgendaWeekGridEventLayout[] {
  const dayIndexByKey = new Map(
    weekDays.map((day) => [day.dateKey, day.dayIndex])
  );

  const layouts: AgendaWeekGridEventLayout[] = [];

  for (const interaction of interactions) {
    const dayIndex = dayIndexByKey.get(
      toDateKey(new Date(interaction.scheduledAt))
    );
    if (dayIndex === undefined) continue;

    const [layout] = layoutGridEvents([interaction]);
    if (!layout) continue;

    layouts.push({ ...layout, dayIndex });
  }

  return layouts;
}

export function shiftSelectedWeek(
  date: Date,
  direction: -1 | 1
): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + direction * 7);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function agendaGridBlockClass(
  contactType: ContactType | null | undefined,
  fallbackIndex: number
): string {
  const palette: ContactType[] = ["professional", "personal", "family"];
  const type =
    contactType ?? palette[fallbackIndex % palette.length];

  switch (type) {
    case "professional":
      return "border border-[var(--border-contact-professional)] bg-[var(--contact-type-professional-muted)] text-foreground";
    case "personal":
      return "border border-[var(--border-contact-personal)] bg-[var(--contact-type-personal-muted)] text-foreground";
    case "family":
      return "border border-[var(--contact-type-family)]/60 bg-[var(--contact-type-family-muted)] text-foreground";
    default:
      return "border border-accent-orange/50 bg-accent-orange-muted text-foreground";
  }
}

export function shiftSelectedDate(
  date: Date,
  direction: -1 | 1
): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + direction);
  next.setHours(0, 0, 0, 0);
  return next;
}
