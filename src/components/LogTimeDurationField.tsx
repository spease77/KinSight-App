"use client";

import {
  DURATION_ADJUSTMENT_OPTIONS,
  type DurationAdjustment,
} from "@/types/time-log";

interface LogTimeDurationFieldProps {
  id: string;
  minutes: string;
  adjustment: DurationAdjustment;
  onMinutesChange: (value: string) => void;
  onAdjustmentChange: (value: DurationAdjustment) => void;
}

export function LogTimeDurationField({
  id,
  minutes,
  adjustment,
  onMinutesChange,
  onAdjustmentChange,
}: LogTimeDurationFieldProps) {
  return (
    <fieldset className="flex w-full flex-col gap-1.5">
      <legend className="ui-label">Duration</legend>
      <div
        className="ui-card flex flex-wrap items-center gap-2 p-1"
        role="group"
        aria-label="Duration adjustment"
      >
        {DURATION_ADJUSTMENT_OPTIONS.map((option) => {
          const active = adjustment === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onAdjustmentChange(option.value)}
              aria-pressed={active}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-normal transition-colors ${
                active
                  ? option.value === "subtract"
                    ? "ui-badge-orange px-2.5 py-1 text-xs"
                    : "ui-badge-green px-2.5 py-1 text-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <input
        id={id}
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        value={minutes}
        onChange={(event) => onMinutesChange(event.target.value)}
        placeholder="Minutes"
        className="ui-input px-3 py-2 text-sm"
      />
    </fieldset>
  );
}
