"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  AGENDA_GRID_SLOT_HEIGHT_PX,
  agendaGridBlockClass,
  buildAgendaGridSlots,
  formatAgendaWeekRange,
  getCalendarWeekDays,
  getWeekHorizontalSnapIndex,
  interactionsForWeek,
  layoutWeekGridEvents,
  scrollWeekGridToInitialPosition,
  shiftSelectedWeek,
  syncWeekHorizontalScroll,
  toDateKey,
} from "@/lib/agenda/hourly-grid";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";
import {
  AGENDA_ITEM_SELECTED_CLASS,
  AGENDA_PANEL_NAV_BUTTON,
  AGENDA_PANEL_TITLE,
  AGENDA_TIMELINE_PANEL_SHELL,
  AGENDA_WEEK_DAY_HEADER,
  AGENDA_WEEK_GRID_FRAME,
  AGENDA_WEEK_HEADER_BAND,
  AGENDA_WEEK_HEADER_HEIGHT_PX,
  AGENDA_WEEK_TIME_SCROLL,
  AGENDA_TIME_LABEL,
  AGENDA_GRID_BORDER_HEADER,
  AGENDA_GRID_BORDER_LINE,
} from "@/components/agenda/agenda-panel-styles";

interface AgendaWeekHourlyGridProps {
  selectedDate: Date;
  interactions: ScheduledInteraction[];
  selectedInteractionId: string | null;
  onSelectedDateChange: (date: Date) => void;
  onInteractionSelect: (interactionId: string) => void;
}

export function AgendaWeekHourlyGrid({
  selectedDate,
  interactions,
  selectedInteractionId,
  onSelectedDateChange,
  onInteractionSelect,
}: AgendaWeekHourlyGridProps) {
  const verticalScrollRef = useRef<HTMLDivElement>(null);
  const headerHorizontalScrollRef = useRef<HTMLDivElement>(null);
  const bodyHorizontalScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingHorizontalRef = useRef(false);

  const slots = useMemo(() => buildAgendaGridSlots(), []);
  const weekDays = useMemo(
    () => getCalendarWeekDays(selectedDate),
    [selectedDate]
  );

  const weekInteractions = useMemo(
    () => interactionsForWeek(interactions, weekDays),
    [interactions, weekDays]
  );

  const eventLayouts = useMemo(
    () => layoutWeekGridEvents(weekInteractions, weekDays),
    [weekInteractions, weekDays]
  );

  const weekScrollKey = weekDays.map((day) => day.dateKey).join("|");
  const weekInteractionSignature = weekInteractions
    .map((item) => `${item.id}:${item.scheduledAt}`)
    .join("|");
  const selectedDateKey = toDateKey(selectedDate);

  const horizontalSnapIndex = useMemo(
    () =>
      getWeekHorizontalSnapIndex(
        weekInteractions,
        weekDays,
        selectedDateKey
      ),
    [weekInteractions, weekDays, selectedDateKey]
  );

  const horizontalScrollContainers = useCallback((): HTMLElement[] => {
    const elements: HTMLElement[] = [];
    if (headerHorizontalScrollRef.current) {
      elements.push(headerHorizontalScrollRef.current);
    }
    if (bodyHorizontalScrollRef.current) {
      elements.push(bodyHorizontalScrollRef.current);
    }
    return elements;
  }, []);

  useLayoutEffect(() => {
    const vertical = verticalScrollRef.current;
    const horizontal = horizontalScrollContainers();
    if (!vertical || horizontal.length === 0) return;

    const applyInitialScroll = () => {
      scrollWeekGridToInitialPosition({
        verticalScrollContainer: vertical,
        horizontalScrollContainers: horizontal,
        weekInteractions,
        weekDays,
        selectedDateKey,
        verticalBehavior: "auto",
      });
    };

    applyInitialScroll();
    window.addEventListener("resize", applyInitialScroll);

    return () => {
      window.removeEventListener("resize", applyInitialScroll);
    };
  }, [
    weekInteractions,
    weekInteractionSignature,
    weekScrollKey,
    selectedDateKey,
    weekDays,
    horizontalSnapIndex,
    horizontalScrollContainers,
  ]);

  const handleHorizontalScroll = useCallback(
    (source: HTMLElement) => {
      if (isSyncingHorizontalRef.current) return;

      isSyncingHorizontalRef.current = true;
      const targets = horizontalScrollContainers().filter(
        (element) => element !== source
      );
      syncWeekHorizontalScroll(source, targets);
      isSyncingHorizontalRef.current = false;
    },
    [horizontalScrollContainers]
  );

  useEffect(() => {
    const elements: HTMLDivElement[] = [];
    if (headerHorizontalScrollRef.current) {
      elements.push(headerHorizontalScrollRef.current);
    }
    if (bodyHorizontalScrollRef.current) {
      elements.push(bodyHorizontalScrollRef.current);
    }

    const onScroll = (event: Event) => {
      handleHorizontalScroll(event.currentTarget as HTMLElement);
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      event.preventDefault();
      const element = event.currentTarget as HTMLElement;
      element.scrollLeft += event.deltaY;
      handleHorizontalScroll(element);
    };

    for (const element of elements) {
      element.addEventListener("scroll", onScroll, { passive: true });
      element.addEventListener("wheel", onWheel, { passive: false });
    }

    return () => {
      for (const element of elements) {
        element.removeEventListener("scroll", onScroll);
        element.removeEventListener("wheel", onWheel);
      }
    };
  }, [handleHorizontalScroll, weekScrollKey]);

  const gridHeight = slots.length * AGENDA_GRID_SLOT_HEIGHT_PX;

  return (
    <section aria-label="Weekly schedule grid" className={AGENDA_TIMELINE_PANEL_SHELL}>
      <div className="flex items-center justify-between gap-2">
        <p className={AGENDA_PANEL_TITLE}>
          {formatAgendaWeekRange(weekDays)}
        </p>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onSelectedDateChange(shiftSelectedWeek(selectedDate, -1))
            }
            className={AGENDA_PANEL_NAV_BUTTON}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() =>
              onSelectedDateChange(shiftSelectedWeek(selectedDate, 1))
            }
            className={AGENDA_PANEL_NAV_BUTTON}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className={`${AGENDA_WEEK_GRID_FRAME} agenda-week-body-band agenda-calendar-body-band`}>
        <div ref={verticalScrollRef} className={AGENDA_WEEK_TIME_SCROLL}>
          <div className="agenda-week-scroll-content">
            <div className={AGENDA_WEEK_HEADER_BAND}>
              <div
                aria-hidden="true"
                className={`agenda-week-time-corner ${AGENDA_GRID_BORDER_HEADER}`}
                style={{ height: AGENDA_WEEK_HEADER_HEIGHT_PX }}
              />

              <div
                ref={headerHorizontalScrollRef}
                className="agenda-week-day-header-scroll"
              >
                <div
                  className="agenda-week-day-header-track"
                  style={{ height: AGENDA_WEEK_HEADER_HEIGHT_PX }}
                >
                  {weekDays.map((day, dayIndex) => {
                    const isSelected = day.dateKey === selectedDateKey;

                    return (
                      <button
                        key={`header-${day.dateKey}`}
                        type="button"
                        onClick={() => onSelectedDateChange(day.date)}
                        className={`${AGENDA_WEEK_DAY_HEADER} ${AGENDA_GRID_BORDER_LINE} ${
                          dayIndex === 0 ? "border-l-0" : "border-l"
                        } ${
                          isSelected
                            ? "bg-accent-green-muted text-foreground"
                            : "text-muted hover:bg-card-hover hover:text-foreground"
                        }`}
                        style={{
                          gridColumn: dayIndex + 1,
                          gridRow: 1,
                          height: AGENDA_WEEK_HEADER_HEIGHT_PX,
                        }}
                        aria-pressed={isSelected}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="agenda-week-grid-body">
              <div
                className="agenda-week-time-gutter"
                style={{ minHeight: gridHeight }}
              >
                {slots.map((slot) => (
                  <div
                    key={slot.minutesFromMidnight}
                    data-agenda-slot-minutes={slot.minutesFromMidnight}
                    className={`${AGENDA_TIME_LABEL} time-grid-row`}
                  >
                    {slot.label}
                  </div>
                ))}
              </div>

              <div
                ref={bodyHorizontalScrollRef}
                className="calendar-days-wrapper"
              >
                <div
                  className="agenda-week-days-track"
                  style={{
                    height: gridHeight,
                    minHeight: gridHeight,
                    gridTemplateRows: `repeat(${slots.length}, var(--agenda-slot-height))`,
                  }}
                >
                  {slots.map((slot, slotIndex) => {
                    const gridRow = slotIndex + 1;

                    return (
                      <Fragment key={slot.minutesFromMidnight}>
                        {weekDays.map((day, dayIndex) => {
                          const isSelected = day.dateKey === selectedDateKey;

                          return (
                            <div
                              key={`${day.dateKey}-${slot.minutesFromMidnight}`}
                              className={`agenda-week-grid-cell time-grid-row border-l border-t ${AGENDA_GRID_BORDER_LINE} ${
                                dayIndex === 0 ? "border-l-0" : ""
                              } ${isSelected ? "bg-accent-green-muted/10" : ""}`}
                              style={{
                                gridColumn: dayIndex + 1,
                                gridRow,
                              }}
                            />
                          );
                        })}
                      </Fragment>
                    );
                  })}

                  <div
                    className="agenda-week-appointments-layer"
                    style={{ height: gridHeight }}
                  >
                    <div
                      className="relative"
                      style={{ height: gridHeight }}
                    >
                      {eventLayouts.map(
                        ({ interaction, topPx, heightPx, dayIndex }, index) => {
                          const isSelected =
                            selectedInteractionId === interaction.id;
                          const columnWidth = 100 / 7;

                          return (
                            <button
                              key={interaction.id}
                              type="button"
                              onClick={() => onInteractionSelect(interaction.id)}
                              className={`agenda-week-appointment pointer-events-auto overflow-hidden rounded-sm px-1 py-0.5 text-left shadow-sm transition-shadow ${agendaGridBlockClass(
                                interaction.contactType,
                                index
                              )} ${isSelected ? AGENDA_ITEM_SELECTED_CLASS : ""}`}
                              style={{
                                top: topPx,
                                left: `calc(${dayIndex * columnWidth}% + 2px)`,
                                width: `calc(${columnWidth}% - 4px)`,
                                height: heightPx,
                              }}
                              aria-pressed={isSelected}
                              aria-label={`${interaction.contactName}, ${interaction.title}`}
                            >
                              <p className="truncate text-[9px] font-medium leading-tight">
                                {interaction.contactName}
                              </p>
                              {heightPx >= AGENDA_GRID_SLOT_HEIGHT_PX && (
                                <p className="truncate text-[8px] leading-tight text-muted">
                                  {interaction.title}
                                </p>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
