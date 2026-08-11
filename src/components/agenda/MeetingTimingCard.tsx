"use client";

import { useEffect, useRef, useState } from "react";
import type { MeetingActivePicker } from "@/lib/calendar/meeting-picker";
import {
  applyAllDayTimes,
  joinDatetimeLocal,
  splitDatetimeLocal,
} from "@/lib/calendar/meeting-picker";
import { MeetingGroupedCard } from "@/components/agenda/MeetingGroupedCard";
import { MeetingInlineCalendar } from "@/components/agenda/MeetingInlineCalendar";
import { MeetingInlineTimeWheel } from "@/components/agenda/MeetingInlineTimeWheel";
import { MeetingIosSwitch } from "@/components/agenda/MeetingIosSwitch";
import { MeetingPickerPanel } from "@/components/agenda/MeetingPickerPanel";
import { MeetingTimingRow } from "@/components/agenda/MeetingTimingRow";

interface MeetingTimingCardProps {
  isAllDay: boolean;
  onAllDayChange: (value: boolean) => void;
  startAt: string;
  endAt: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  disabled?: boolean;
}

function isStartPicker(picker: MeetingActivePicker): boolean {
  return picker === "start-date" || picker === "start-time";
}

function isEndPicker(picker: MeetingActivePicker): boolean {
  return picker === "end-date" || picker === "end-time";
}

export function MeetingTimingCard({
  isAllDay,
  onAllDayChange,
  startAt,
  endAt,
  onStartChange,
  onEndChange,
  disabled = false,
}: MeetingTimingCardProps) {
  const [activePicker, setActivePicker] = useState<MeetingActivePicker>(null);
  const endsRowRef = useRef<HTMLDivElement>(null);
  const endPickerRef = useRef<HTMLDivElement>(null);
  const startDate = startAt.split("T")[0] ?? "";
  const startParts = splitDatetimeLocal(startAt);
  const endParts = splitDatetimeLocal(endAt);

  useEffect(() => {
    if (!activePicker) return;
    const frame = requestAnimationFrame(() => {
      if (isStartPicker(activePicker)) {
        endsRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else if (isEndPicker(activePicker)) {
        endPickerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activePicker]);

  const handleAllDayChange = (next: boolean) => {
    setActivePicker(null);
    if (next) {
      const adjusted = applyAllDayTimes(startAt, endAt);
      onStartChange(adjusted.start);
      onEndChange(adjusted.end);
    }
    onAllDayChange(next);
  };

  const startPickerOpen = isStartPicker(activePicker);
  const endPickerOpen = isEndPicker(activePicker);

  return (
    <div className="meeting-timing-stack shrink-0">
      <MeetingGroupedCard className="!overflow-visible rounded-b-none border-b-0">
        <div className="flex min-h-[3.25rem] items-center justify-between gap-4 px-4 py-3">
          <span className="text-[15px] text-foreground">All-day</span>
          <MeetingIosSwitch
            checked={isAllDay}
            onChange={handleAllDayChange}
            disabled={disabled}
            label="All-day event"
            accent="indigo"
          />
        </div>

        <MeetingTimingRow
          label="Starts"
          rowKey="start"
          value={startAt}
          activePicker={activePicker}
          onActivePickerChange={setActivePicker}
          disabled={disabled}
          showTime={!isAllDay}
        />

        <MeetingPickerPanel open={startPickerOpen}>
          {activePicker === "start-date" ? (
            <MeetingInlineCalendar
              value={startParts.date}
              onChange={(nextDate) =>
                onStartChange(joinDatetimeLocal(nextDate, startParts.time))
              }
            />
          ) : null}
          {activePicker === "start-time" ? (
            <MeetingInlineTimeWheel
              value={startParts.time}
              onChange={(nextTime) =>
                onStartChange(joinDatetimeLocal(startParts.date, nextTime))
              }
            />
          ) : null}
        </MeetingPickerPanel>
      </MeetingGroupedCard>

      <MeetingGroupedCard className="!overflow-visible -mt-px rounded-t-none">
        <div ref={endsRowRef}>
          <MeetingTimingRow
            label="Ends"
            rowKey="end"
            value={endAt}
            activePicker={activePicker}
            onActivePickerChange={setActivePicker}
            disabled={disabled}
            showTime={!isAllDay}
          />
        </div>

        <div ref={endPickerRef}>
          <MeetingPickerPanel open={endPickerOpen}>
            {activePicker === "end-date" ? (
              <MeetingInlineCalendar
                value={endParts.date}
                onChange={(nextDate) =>
                  onEndChange(joinDatetimeLocal(nextDate, endParts.time))
                }
                minDate={startDate}
              />
            ) : null}
            {activePicker === "end-time" ? (
              <MeetingInlineTimeWheel
                value={endParts.time}
                onChange={(nextTime) =>
                  onEndChange(joinDatetimeLocal(endParts.date, nextTime))
                }
              />
            ) : null}
          </MeetingPickerPanel>
        </div>
      </MeetingGroupedCard>
    </div>
  );
}
