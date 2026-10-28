"use client";

import { useCallback, useRef } from "react";
import { AgendaDayHourlyGrid } from "@/components/agenda/AgendaDayHourlyGrid";
import { AgendaMonthCalendarGrid } from "@/components/agenda/AgendaMonthCalendarGrid";
import { AgendaWeekHourlyGrid } from "@/components/agenda/AgendaWeekHourlyGrid";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";
import { shiftSelectedDate, shiftSelectedWeek } from "@/lib/agenda/hourly-grid";
import type { AgendaTimeFrame } from "@/types/scheduled-interaction";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";

interface AgendaHourlyGridProps {
  selectedDate: Date;
  timeFrame: AgendaTimeFrame;
  interactions: ScheduledInteraction[];
  selectedInteractionId: string | null;
  onSelectedDateChange: (date: Date) => void;
  onInteractionSelect: (interactionId: string) => void;
  onDayEventsSelect?: (events: ScheduledInteraction[]) => void;
}

export function AgendaHourlyGrid({
  selectedDate,
  timeFrame,
  interactions,
  selectedInteractionId,
  onSelectedDateChange,
  onInteractionSelect,
  onDayEventsSelect,
}: AgendaHourlyGridProps) {
  const swipeFrameRef = useRef<HTMLDivElement>(null);
  const canSwipe = timeFrame === "day" || timeFrame === "week";

  const step = useCallback(
    (direction: -1 | 1) => {
      if (!canSwipe) return;
      onSelectedDateChange(
        timeFrame === "week"
          ? shiftSelectedWeek(selectedDate, direction)
          : shiftSelectedDate(selectedDate, direction)
      );

      swipeFrameRef.current?.animate(
        [
          { transform: `translateX(${direction * 28}px)`, opacity: 0.4 },
          { transform: "translateX(0)", opacity: 1 },
        ],
        { duration: 200, easing: "ease-out" }
      );
    },
    [canSwipe, onSelectedDateChange, selectedDate, timeFrame]
  );

  const bindSwipe = useHorizontalSwipe({
    onSwipeLeft: () => step(1),
    onSwipeRight: () => step(-1),
    enabled: canSwipe,
  });

  const setSwipeRef = useCallback(
    (node: HTMLDivElement | null) => {
      swipeFrameRef.current = node;
      bindSwipe(node);
    },
    [bindSwipe]
  );

  if (timeFrame === "list") {
    return null;
  }

  if (timeFrame === "week") {
    return (
      <div ref={setSwipeRef} className="agenda-swipe-frame flex min-h-0 flex-1 flex-col">
        <AgendaWeekHourlyGrid
          selectedDate={selectedDate}
          interactions={interactions}
          selectedInteractionId={selectedInteractionId}
          onSelectedDateChange={onSelectedDateChange}
          onInteractionSelect={onInteractionSelect}
        />
      </div>
    );
  }

  if (timeFrame === "month") {
    return (
      <AgendaMonthCalendarGrid
        selectedDate={selectedDate}
        interactions={interactions}
        selectedInteractionId={selectedInteractionId}
        onSelectedDateChange={onSelectedDateChange}
        onInteractionSelect={onInteractionSelect}
        onDayEventsSelect={onDayEventsSelect}
      />
    );
  }

  return (
    <div ref={setSwipeRef} className="agenda-swipe-frame flex min-h-0 flex-1 flex-col">
      <AgendaDayHourlyGrid
        selectedDate={selectedDate}
        interactions={interactions}
        selectedInteractionId={selectedInteractionId}
        onSelectedDateChange={onSelectedDateChange}
        onInteractionSelect={onInteractionSelect}
      />
    </div>
  );
}
