"use client";

import type { MeetingFormat } from "@/types/time-log";
import { MEETING_FORMAT_OPTIONS } from "@/types/time-log";

interface LogTimeMeetingFormatFieldProps {
  value: MeetingFormat;
  onChange: (value: MeetingFormat) => void;
}

export function LogTimeMeetingFormatField({
  value,
  onChange,
}: LogTimeMeetingFormatFieldProps) {
  return (
    <fieldset className="flex w-full flex-col gap-1.5">
      <legend className="ui-label">Meeting Format</legend>
      <div
        className="ui-card flex flex-wrap items-center gap-2 p-1"
        role="group"
        aria-label="Meeting format"
      >
        {MEETING_FORMAT_OPTIONS.map((option) => {
          const active = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-normal transition-colors ${
                active
                  ? "ui-badge-green px-2.5 py-1 text-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
