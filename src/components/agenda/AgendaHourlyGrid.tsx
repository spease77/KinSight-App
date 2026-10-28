"use client";

import { AgendaDayHourlyGrid } from "@/components/agenda/AgendaDayHourlyGrid";
import { AgendaMonthCalendarGrid } from "@/components/agenda/AgendaMonthCalendarGrid";
import { AgendaWeekHourlyGrid } from "@/components/agenda/AgendaWeekHourlyGrid";
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
  if (timeFrame === "list") {
    return null;
  }

  if (timeFrame === "week") {
    return (
      <AgendaWeekHourlyGrid
        selectedDate={selectedDate}
        interactions={interactions}
        selectedInteractionId={selectedInteractionId}
        onSelectedDateChange={onSelectedDateChange}
        onInteractionSelect={onInteractionSelect}
      />
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
    <AgendaDayHourlyGrid
      selectedDate={selectedDate}
      interactions={interactions}
      selectedInteractionId={selectedInteractionId}
      onSelectedDateChange={onSelectedDateChange}
      onInteractionSelect={onInteractionSelect}
    />
  );
}
