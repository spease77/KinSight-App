"use client";

import { useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  AGENDA_GRID_SLOT_HEIGHT_PX,
  agendaGridBlockClass,
  buildAgendaGridSlots,
  formatAgendaSelectedDate,
  getDayGridTimeRange,
  interactionsForDate,
  layoutGridEvents,
  scrollDayGridToTarget,
  shiftSelectedDate,
  toDateKey,
} from "@/lib/agenda/hourly-grid";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";
import {
  AGENDA_TIMELINE_DAY_PANEL_SHELL,
  AGENDA_TIMELINE_FRAME,
  AGENDA_DAY_TIME_SCROLL,
  AGENDA_ITEM_SELECTED_CLASS,
  AGENDA_PANEL_NAV_BUTTON,
  AGENDA_PANEL_TITLE,
  AGENDA_GRID_BORDER_LINE,
} from "@/components/agenda/agenda-panel-styles";

interface AgendaDayHourlyGridProps {
  selectedDate: Date;
  interactions: ScheduledInteraction[];
  selectedInteractionId: string | null;
  onSelectedDateChange: (date: Date) => void;
  onInteractionSelect: (interactionId: string) => void;
}

export function AgendaDayHourlyGrid({
  selectedDate,
  interactions,
  selectedInteractionId,
  onSelectedDateChange,
  onInteractionSelect,
}: AgendaDayHourlyGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const dayInteractions = useMemo(
    () => interactionsForDate(interactions, selectedDate),
    [interactions, selectedDate]
  );

  const timeRange = useMemo(
    () => getDayGridTimeRange(dayInteractions),
    [dayInteractions]
  );

  const slots = useMemo(
    () => buildAgendaGridSlots(timeRange),
    [timeRange]
  );

  const eventLayouts = useMemo(
    () => layoutGridEvents(dayInteractions, timeRange),
    [dayInteractions, timeRange]
  );

  const selectedDateKey = toDateKey(selectedDate);
  const dayInteractionSignature = dayInteractions
    .map((item) => `${item.id}:${item.scheduledAt}`)
    .join("|");

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const applyInitialScroll = () => {
      scrollDayGridToTarget({
        scrollContainer: container,
        dayInteractions,
        range: timeRange,
        behavior: "auto",
      });
    };

    applyInitialScroll();
    window.addEventListener("resize", applyInitialScroll);

    return () => {
      window.removeEventListener("resize", applyInitialScroll);
    };
  }, [dayInteractions, dayInteractionSignature, selectedDateKey, timeRange]);

  const gridHeight = slots.length * AGENDA_GRID_SLOT_HEIGHT_PX;

  return (
    <section aria-label="Daily schedule grid" className={AGENDA_TIMELINE_DAY_PANEL_SHELL}>
      <div className="flex items-center justify-between gap-2">
        <p className={AGENDA_PANEL_TITLE}>
          {formatAgendaSelectedDate(selectedDate)}
        </p>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onSelectedDateChange(shiftSelectedDate(selectedDate, -1))
            }
            className={AGENDA_PANEL_NAV_BUTTON}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() =>
              onSelectedDateChange(shiftSelectedDate(selectedDate, 1))
            }
            className={AGENDA_PANEL_NAV_BUTTON}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        className={`${AGENDA_TIMELINE_FRAME} agenda-calendar-body-band`}
        style={
          {
            "--agenda-grid-start-hour": timeRange.startMinutes / 60,
            "--agenda-grid-end-hour": timeRange.endMinutes / 60,
          } as CSSProperties
        }
      >
        <div ref={scrollContainerRef} className={AGENDA_DAY_TIME_SCROLL}>
          <div
            className="relative"
            style={{ height: gridHeight, minHeight: gridHeight }}
          >
            {slots.map((slot) => (
              <div
                key={slot.minutesFromMidnight}
                data-agenda-slot-minutes={slot.minutesFromMidnight}
                className="agenda-day-scroll-row time-grid-row"
              >
                <div className="agenda-week-time-slot flex items-start justify-end whitespace-nowrap pr-1.5 pt-1 font-mono text-[10px] leading-none text-muted">
                  {slot.label}
                </div>
                <div
                  className={`agenda-day-timeline-cell border-t ${AGENDA_GRID_BORDER_LINE}`}
                />
              </div>
            ))}

            <div
              className="agenda-day-appointments-layer"
              style={{
                top: 0,
                left: "var(--agenda-time-gutter-width)",
                right: 0,
                height: gridHeight,
              }}
            >
              {eventLayouts.map(({ interaction, topPx, heightPx }, index) => {
                const isSelected = selectedInteractionId === interaction.id;

                return (
                  <button
                    key={interaction.id}
                    type="button"
                    onClick={() => onInteractionSelect(interaction.id)}
                    className={`agenda-day-appointment pointer-events-auto overflow-hidden rounded-md px-2 py-1 text-left shadow-sm transition-shadow ${agendaGridBlockClass(
                      interaction.contactType,
                      index
                    )} ${isSelected ? AGENDA_ITEM_SELECTED_CLASS : ""}`}
                    style={{
                      top: topPx,
                      height: heightPx,
                      left: 4,
                      right: 4,
                    }}
                    aria-pressed={isSelected}
                    aria-label={`${interaction.contactName}, ${interaction.title}`}
                  >
                    <p className="truncate text-xs font-medium leading-tight">
                      {interaction.contactName}
                    </p>
                    <p className="truncate text-[10px] leading-tight opacity-90">
                      {interaction.title}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
