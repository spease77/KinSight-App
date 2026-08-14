"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatDatePill,
  joinDatetimeLocal,
  splitDatetimeLocal,
} from "@/lib/calendar/meeting-picker";
import { MeetingGroupedCard } from "@/components/agenda/MeetingGroupedCard";
import { MeetingInlineCalendar } from "@/components/agenda/MeetingInlineCalendar";
import { MeetingIosSwitch } from "@/components/agenda/MeetingIosSwitch";
import { MeetingPickerPanel } from "@/components/agenda/MeetingPickerPanel";

interface LogTimeTimingCardProps {
  loggedAt: string;
  onLoggedAtChange: (value: string) => void;
  durationHours: string;
  durationMinutes: string;
  onDurationHoursChange: (value: string) => void;
  onDurationMinutesChange: (value: string) => void;
  isAllDay: boolean;
  onAllDayChange: (value: boolean) => void;
  disabled?: boolean;
}

export function LogTimeTimingCard({
  loggedAt,
  onLoggedAtChange,
  durationHours,
  durationMinutes,
  onDurationHoursChange,
  onDurationMinutesChange,
  isAllDay,
  onAllDayChange,
  disabled = false,
}: LogTimeTimingCardProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const { date, time } = splitDatetimeLocal(loggedAt);

  useEffect(() => {
    if (!datePickerOpen) return;
    const frame = requestAnimationFrame(() => {
      pickerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [datePickerOpen]);

  const handleDateChange = (nextDate: string) => {
    onLoggedAtChange(joinDatetimeLocal(nextDate, time));
  };

  const clampDurationPart = (value: string, max: number) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    const parsed = Number(digits);
    if (!Number.isFinite(parsed)) return "";
    return String(Math.min(Math.max(parsed, 0), max));
  };

  return (
    <MeetingGroupedCard className="!overflow-visible">
      <div className="flex min-h-[3.25rem] items-center justify-between gap-4 px-4 py-3">
        <span className="text-[15px] text-foreground">All-day</span>
        <MeetingIosSwitch
          checked={isAllDay}
          onChange={onAllDayChange}
          disabled={disabled}
          label="All-day log"
          accent="indigo"
        />
      </div>

      <div className="flex min-h-[3.25rem] items-center justify-between gap-4 px-4 py-3">
        <span className="shrink-0 text-[15px] text-foreground">Date</span>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setDatePickerOpen((open) => !open)}
            aria-expanded={datePickerOpen}
            aria-label="Log date"
            className={`meeting-datetime-pill transition-colors ${
              datePickerOpen ? "meeting-datetime-pill--active" : ""
            }`}
          >
            {formatDatePill(date)}
          </button>

          {!isAllDay ? (
            <>
              <label className="sr-only" htmlFor="log-time-duration-hours">
                Hours
              </label>
              <input
                id="log-time-duration-hours"
                type="number"
                min={0}
                max={24}
                inputMode="numeric"
                value={durationHours}
                disabled={disabled}
                onChange={(event) =>
                  onDurationHoursChange(clampDurationPart(event.target.value, 24))
                }
                placeholder="0"
                aria-label="Duration hours"
                className="meeting-datetime-pill w-[4.25rem] bg-transparent text-center text-sm text-foreground placeholder:text-muted focus:outline-none disabled:opacity-40"
              />
              <label className="sr-only" htmlFor="log-time-duration-minutes">
                Minutes
              </label>
              <input
                id="log-time-duration-minutes"
                type="number"
                min={0}
                max={59}
                inputMode="numeric"
                value={durationMinutes}
                disabled={disabled}
                onChange={(event) =>
                  onDurationMinutesChange(clampDurationPart(event.target.value, 59))
                }
                placeholder="30"
                aria-label="Duration minutes"
                className="meeting-datetime-pill w-[4.25rem] bg-transparent text-center text-sm text-foreground placeholder:text-muted focus:outline-none disabled:opacity-40"
              />
            </>
          ) : null}
        </div>
      </div>

      <div ref={pickerRef}>
        <MeetingPickerPanel open={datePickerOpen}>
          <MeetingInlineCalendar value={date} onChange={handleDateChange} />
        </MeetingPickerPanel>
      </div>
    </MeetingGroupedCard>
  );
}
