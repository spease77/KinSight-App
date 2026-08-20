"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toDateKey } from "@/lib/agenda/hourly-grid";
import {
  addCalendarMonths,
  alignDateToMonth,
  buildMonthWindow,
  formatAgendaMonthLabel,
  getCalendarMonthGrid,
  getTodayDateKey,
  interactionsByDateKey,
  monthAnchorKey,
  MONTH_WEEKDAY_LABELS,
  shiftSelectedMonth,
  startOfCalendarMonth,
  type AgendaMonthCell,
} from "@/lib/agenda/month-grid";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";
import {
  AGENDA_MONTH_BLOCK_LABEL,
  AGENDA_MONTH_GRID,
  AGENDA_MONTH_NAV_HEADER,
  AGENDA_MONTH_PANEL_SHELL,
  AGENDA_MONTH_SCROLL,
  AGENDA_MONTH_WEEKDAY,
  AGENDA_PANEL_NAV_BUTTON,
  AGENDA_TIMELINE_FRAME,
} from "@/components/agenda/agenda-panel-styles";

const INITIAL_MONTH_BUFFER = 4;
const LOAD_MONTH_BATCH = 3;
const EDGE_THRESHOLD_PX = 480;

interface AgendaMonthCalendarGridProps {
  selectedDate: Date;
  interactions: ScheduledInteraction[];
  selectedInteractionId: string | null;
  onSelectedDateChange: (date: Date) => void;
  onInteractionSelect: (interactionId: string) => void;
}

function AgendaMonthBlock({
  monthStart,
  monthKey,
  todayKey,
  eventsByDate,
  selectedDateKey,
  onDaySelect,
  blockRef,
}: {
  monthStart: Date;
  monthKey: string;
  todayKey: string;
  eventsByDate: Map<string, ScheduledInteraction[]>;
  selectedDateKey: string;
  onDaySelect: (cell: AgendaMonthCell, dayEvents: ScheduledInteraction[]) => void;
  blockRef: (node: HTMLDivElement | null) => void;
}) {
  const monthCells = useMemo(
    () => getCalendarMonthGrid(monthStart),
    [monthKey, monthStart]
  );

  return (
    <div
      ref={blockRef}
      className="agenda-month-block"
      data-month-key={monthAnchorKey(monthStart)}
    >
      <p className={AGENDA_MONTH_BLOCK_LABEL}>
        {formatAgendaMonthLabel(monthStart)}
      </p>

      <div className="agenda-month-weekday-row">
        {MONTH_WEEKDAY_LABELS.map((label) => (
          <div key={label} className={AGENDA_MONTH_WEEKDAY}>
            {label}
          </div>
        ))}
      </div>

      <div className={`${AGENDA_MONTH_GRID} agenda-month-grid--scroll`}>
        {monthCells.map((cell) => {
          const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
          const isSelected = cell.dateKey === selectedDateKey;
          const isToday = cell.dateKey === todayKey;
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => onDaySelect(cell, dayEvents)}
              className={`agenda-month-day-cell transition-colors hover:bg-card-hover ${
                isSelected ? "bg-accent-green-muted/20" : ""
              }`}
              aria-pressed={isSelected}
              aria-label={`${cell.dayOfMonth}${hasEvents ? `, ${dayEvents.length} events` : ""}`}
              aria-current={isToday ? "date" : undefined}
            >
              <span
                className={`agenda-month-day-number ${
                  isToday
                    ? "agenda-month-day-number--today bg-[var(--contact-type-professional)] text-foreground"
                    : cell.isCurrentMonth
                      ? "text-foreground"
                      : "text-muted/50"
                }`}
              >
                {cell.dayOfMonth}
              </span>

              {hasEvents && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-accent-green-bright"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AgendaMonthCalendarGrid({
  selectedDate,
  interactions,
  onSelectedDateChange,
  onInteractionSelect,
}: AgendaMonthCalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthBlockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollHeightBeforePrependRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const hasInitialScrolledRef = useRef(false);
  const trackedMonthKeyRef = useRef(monthAnchorKey(selectedDate));

  const [months, setMonths] = useState(() =>
    buildMonthWindow(selectedDate, INITIAL_MONTH_BUFFER, INITIAL_MONTH_BUFFER)
  );

  const eventsByDate = useMemo(
    () => interactionsByDateKey(interactions),
    [interactions]
  );

  const selectedDateKey = toDateKey(selectedDate);
  const todayKey = getTodayDateKey();

  const setMonthBlockRef = useCallback(
    (monthStart: Date) => (node: HTMLDivElement | null) => {
      const key = monthAnchorKey(monthStart);
      if (node) {
        monthBlockRefs.current.set(key, node);
      } else {
        monthBlockRefs.current.delete(key);
      }
    },
    []
  );

  const handleDaySelect = useCallback(
    (cell: AgendaMonthCell, dayEvents: ScheduledInteraction[]) => {
      onSelectedDateChange(cell.date);
      if (dayEvents.length > 0) {
        onInteractionSelect(dayEvents[0].id);
      }
    },
    [onInteractionSelect, onSelectedDateChange]
  );

  const scrollToMonthBlock = useCallback((monthStart: Date) => {
    const scrollEl = scrollRef.current;
    const monthKey = monthAnchorKey(monthStart);
    const block = monthBlockRefs.current.get(monthKey);
    if (!scrollEl || !block) return false;

    isProgrammaticScrollRef.current = true;
    scrollEl.scrollTop = block.offsetTop;
    trackedMonthKeyRef.current = monthKey;

    window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 120);

    return true;
  }, []);

  const navigateMonth = useCallback(
    (direction: -1 | 1) => {
      const targetDate = shiftSelectedMonth(selectedDate, direction);
      const targetMonthStart = startOfCalendarMonth(targetDate);
      const monthKey = monthAnchorKey(targetMonthStart);
      const block = monthBlockRefs.current.get(monthKey);

      if (!block) {
        trackedMonthKeyRef.current = monthKey;
        onSelectedDateChange(targetDate);
        setMonths(
          buildMonthWindow(targetDate, INITIAL_MONTH_BUFFER, INITIAL_MONTH_BUFFER)
        );
        hasInitialScrolledRef.current = false;
        return;
      }

      trackedMonthKeyRef.current = monthKey;
      onSelectedDateChange(targetDate);
      scrollToMonthBlock(targetMonthStart);
    },
    [onSelectedDateChange, scrollToMonthBlock, selectedDate]
  );

  const prependMonths = useCallback(() => {
    if (isLoadingMoreRef.current) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    isLoadingMoreRef.current = true;
    scrollHeightBeforePrependRef.current = scrollEl.scrollHeight;

    setMonths((current) => {
      const first = current[0];
      const added = Array.from({ length: LOAD_MONTH_BATCH }, (_, index) =>
        addCalendarMonths(first, -(LOAD_MONTH_BATCH - index))
      );
      return [...added, ...current];
    });
  }, []);

  const appendMonths = useCallback(() => {
    if (isLoadingMoreRef.current) return;

    isLoadingMoreRef.current = true;

    setMonths((current) => {
      const last = current[current.length - 1];
      const added = Array.from({ length: LOAD_MONTH_BATCH }, (_, index) =>
        addCalendarMonths(last, index + 1)
      );
      return [...current, ...added];
    });
  }, []);

  const handleScroll = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || isProgrammaticScrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollEl;

    if (scrollTop < EDGE_THRESHOLD_PX) {
      prependMonths();
    } else if (scrollHeight - scrollTop - clientHeight < EDGE_THRESHOLD_PX) {
      appendMonths();
    }
  }, [appendMonths, prependMonths]);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || scrollHeightBeforePrependRef.current === 0) return;

    const addedHeight = scrollEl.scrollHeight - scrollHeightBeforePrependRef.current;
    scrollEl.scrollTop += addedHeight;
    scrollHeightBeforePrependRef.current = 0;
    isLoadingMoreRef.current = false;
  }, [months]);

  useLayoutEffect(() => {
    if (isLoadingMoreRef.current && scrollHeightBeforePrependRef.current === 0) {
      isLoadingMoreRef.current = false;
    }
  }, [months]);

  useLayoutEffect(() => {
    if (hasInitialScrolledRef.current) return;

    const scrollEl = scrollRef.current;
    const monthKey = monthAnchorKey(selectedDate);
    const block = monthBlockRefs.current.get(monthKey);

    if (scrollEl && block) {
      scrollToMonthBlock(startOfCalendarMonth(selectedDate));
      hasInitialScrolledRef.current = true;
    }
  }, [months, scrollToMonthBlock, selectedDate]);

  useEffect(() => {
    const monthKey = monthAnchorKey(selectedDate);
    if (monthKey === trackedMonthKeyRef.current) return;

    trackedMonthKeyRef.current = monthKey;

    const scrollEl = scrollRef.current;
    const block = monthBlockRefs.current.get(monthKey);

    if (scrollEl && block) {
      scrollToMonthBlock(startOfCalendarMonth(selectedDate));
      return;
    }

    setMonths(buildMonthWindow(selectedDate, INITIAL_MONTH_BUFFER, INITIAL_MONTH_BUFFER));
    hasInitialScrolledRef.current = false;
  }, [scrollToMonthBlock, selectedDate]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;

        let bestEntry: IntersectionObserverEntry | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (
            !bestEntry ||
            entry.intersectionRatio > bestEntry.intersectionRatio
          ) {
            bestEntry = entry;
          }
        }

        if (!bestEntry) return;

        const monthKey = (bestEntry.target as HTMLElement).dataset.monthKey;
        if (!monthKey || monthKey === trackedMonthKeyRef.current) return;

        trackedMonthKeyRef.current = monthKey;
        const [year, monthIndex] = monthKey.split("-").map(Number);
        const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
        onSelectedDateChange(alignDateToMonth(selectedDate, monthStart));
      },
      {
        root: scrollEl,
        threshold: [0.35, 0.5, 0.65],
        rootMargin: "0px 0px -55% 0px",
      }
    );

    for (const block of monthBlockRefs.current.values()) {
      observer.observe(block);
    }

    return () => observer.disconnect();
  }, [months, onSelectedDateChange, selectedDate]);

  return (
    <section aria-label="Monthly calendar" className={AGENDA_MONTH_PANEL_SHELL}>
      <div className={AGENDA_MONTH_NAV_HEADER}>
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className={AGENDA_PANEL_NAV_BUTTON}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className={AGENDA_PANEL_NAV_BUTTON}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className={`${AGENDA_TIMELINE_FRAME} agenda-calendar-body-band`}>
        <div
          ref={scrollRef}
          className={AGENDA_MONTH_SCROLL}
          onScroll={handleScroll}
        >
          {months.map((monthStart) => {
            const monthKey = monthAnchorKey(monthStart);

            return (
              <AgendaMonthBlock
                key={monthKey}
                monthStart={monthStart}
                monthKey={monthKey}
                todayKey={todayKey}
                eventsByDate={eventsByDate}
                selectedDateKey={selectedDateKey}
                onDaySelect={handleDaySelect}
                blockRef={setMonthBlockRef(monthStart)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
