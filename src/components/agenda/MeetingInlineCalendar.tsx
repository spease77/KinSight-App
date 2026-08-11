"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatAgendaMonthLabel,
  getCalendarMonthGrid,
  MONTH_WEEKDAY_LABELS,
  shiftSelectedMonth,
} from "@/lib/agenda/month-grid";
import { parseDateParts, toDateString } from "@/lib/calendar/meeting-picker";

interface MeetingInlineCalendarProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}

export function MeetingInlineCalendar({
  value,
  onChange,
  minDate,
}: MeetingInlineCalendarProps) {
  const selectedDate = useMemo(() => parseDateParts(value), [value]);
  const [viewDate, setViewDate] = useState(selectedDate);

  useEffect(() => {
    setViewDate(selectedDate);
  }, [selectedDate]);

  const monthCells = useMemo(
    () => getCalendarMonthGrid(viewDate),
    [viewDate]
  );

  const selectedKey = value;

  return (
    <div className="meeting-inline-calendar bg-main/95 px-3 py-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-sans text-sm font-medium text-foreground">
          {formatAgendaMonthLabel(viewDate)}
        </p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setViewDate((current) => shiftSelectedMonth(current, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-icon transition-colors hover:bg-card-hover hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setViewDate((current) => shiftSelectedMonth(current, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-icon transition-colors hover:bg-card-hover hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {MONTH_WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-center font-mono text-[10px] font-semibold uppercase tracking-wide text-muted"
          >
            {label}
          </div>
        ))}

        {monthCells.map((cell) => {
          const isSelected = cell.dateKey === selectedKey;
          const isDisabled = Boolean(minDate && cell.dateKey < minDate);

          return (
            <button
              key={cell.dateKey}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                onChange(cell.dateKey);
                setViewDate(parseDateParts(cell.dateKey));
              }}
              className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                isSelected
                  ? "meeting-calendar-day--selected font-semibold text-main"
                  : cell.isCurrentMonth
                    ? "text-foreground hover:bg-card-hover"
                    : "text-muted/50 hover:bg-card-hover/50"
              }`}
              aria-label={toDateString(cell.date)}
              aria-pressed={isSelected}
            >
              {cell.dayOfMonth}
            </button>
          );
        })}
      </div>
    </div>
  );
}
