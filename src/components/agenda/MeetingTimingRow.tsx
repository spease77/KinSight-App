"use client";

import type { MeetingActivePicker } from "@/lib/calendar/meeting-picker";
import {
  formatDatePill,
  formatTimePill,
  splitDatetimeLocal,
} from "@/lib/calendar/meeting-picker";

type TimingRowPicker = "start-date" | "start-time" | "end-date" | "end-time";

interface MeetingTimingRowProps {
  label: string;
  rowKey: "start" | "end";
  value: string;
  activePicker: MeetingActivePicker;
  onActivePickerChange: (picker: MeetingActivePicker) => void;
  disabled?: boolean;
  showTime?: boolean;
}

export function MeetingTimingRow({
  label,
  rowKey,
  value,
  activePicker,
  onActivePickerChange,
  disabled = false,
  showTime = true,
}: MeetingTimingRowProps) {
  const datePickerKey: TimingRowPicker = `${rowKey}-date`;
  const timePickerKey: TimingRowPicker = `${rowKey}-time`;
  const { date, time } = splitDatetimeLocal(value);

  const togglePicker = (picker: TimingRowPicker) => {
    if (disabled) return;
    onActivePickerChange(activePicker === picker ? null : picker);
  };

  return (
    <div className="flex min-h-[3.25rem] items-center justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-[15px] text-foreground">{label}</span>

      <div className="flex shrink-0 items-center justify-end gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => togglePicker(datePickerKey)}
          aria-expanded={activePicker === datePickerKey}
          aria-label={`${label} date`}
          className={`meeting-datetime-pill transition-colors ${
            activePicker === datePickerKey ? "meeting-datetime-pill--active" : ""
          }`}
        >
          {formatDatePill(date)}
        </button>

        {showTime ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => togglePicker(timePickerKey)}
            aria-expanded={activePicker === timePickerKey}
            aria-label={`${label} time`}
            className={`meeting-datetime-pill transition-colors ${
              activePicker === timePickerKey ? "meeting-datetime-pill--active" : ""
            }`}
          >
            {formatTimePill(time)}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export { applyAllDayTimes } from "@/lib/calendar/meeting-picker";
