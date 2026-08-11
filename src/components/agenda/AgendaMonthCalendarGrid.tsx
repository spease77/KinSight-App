"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toDateKey } from "@/lib/agenda/hourly-grid";
import {
  formatAgendaMonthLabel,
  getCalendarMonthGrid,
  interactionsByDateKey,
  MONTH_WEEKDAY_LABELS,
  shiftSelectedMonth,
} from "@/lib/agenda/month-grid";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";
import {
  AGENDA_CALENDAR_FRAME,
  AGENDA_MONTH_GRID,
  AGENDA_MONTH_WEEKDAY,
  AGENDA_PANEL_NAV_BUTTON,
  AGENDA_PANEL_SHELL,
  AGENDA_PANEL_TITLE,
} from "@/components/agenda/agenda-panel-styles";

interface AgendaMonthCalendarGridProps {
  selectedDate: Date;
  interactions: ScheduledInteraction[];
  selectedInteractionId: string | null;
  onSelectedDateChange: (date: Date) => void;
  onInteractionSelect: (interactionId: string) => void;
}

export function AgendaMonthCalendarGrid({
  selectedDate,
  interactions,
  onSelectedDateChange,
  onInteractionSelect,
}: AgendaMonthCalendarGridProps) {
  const monthCells = useMemo(
    () => getCalendarMonthGrid(selectedDate),
    [selectedDate]
  );

  const eventsByDate = useMemo(
    () => interactionsByDateKey(interactions),
    [interactions]
  );

  const selectedDateKey = toDateKey(selectedDate);

  return (
    <section aria-label="Monthly calendar" className={AGENDA_PANEL_SHELL}>
      <div className="flex items-center justify-between gap-2">
        <p className={AGENDA_PANEL_TITLE}>
          {formatAgendaMonthLabel(selectedDate)}
        </p>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onSelectedDateChange(shiftSelectedMonth(selectedDate, -1))
            }
            className={AGENDA_PANEL_NAV_BUTTON}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() =>
              onSelectedDateChange(shiftSelectedMonth(selectedDate, 1))
            }
            className={AGENDA_PANEL_NAV_BUTTON}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className={`${AGENDA_CALENDAR_FRAME} agenda-calendar-body-band`}>
        <div className="agenda-month-weekday-row">
          {MONTH_WEEKDAY_LABELS.map((label) => (
            <div key={label} className={AGENDA_MONTH_WEEKDAY}>
              {label}
            </div>
          ))}
        </div>

        <div className={AGENDA_MONTH_GRID}>
          {monthCells.map((cell) => {
            const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
            const isSelected = cell.dateKey === selectedDateKey;
            const hasEvents = dayEvents.length > 0;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => {
                  onSelectedDateChange(cell.date);
                  if (dayEvents.length > 0) {
                    onInteractionSelect(dayEvents[0].id);
                  }
                }}
                className={`agenda-month-day-cell transition-colors hover:bg-card-hover ${
                  isSelected ? "bg-accent-green-muted/20" : ""
                }`}
                aria-pressed={isSelected}
                aria-label={`${cell.dayOfMonth}${hasEvents ? `, ${dayEvents.length} events` : ""}`}
                aria-current={cell.isToday ? "date" : undefined}
              >
                <span
                  className={`agenda-month-day-number ${
                    cell.isToday
                      ? "bg-[var(--contact-type-professional)] text-foreground"
                      : cell.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted/50"
                  } ${isSelected && !cell.isToday ? "ring-2 ring-inset ring-accent-green-bright" : ""}`}
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
    </section>
  );
}
