"use client";

import {
  AGENDA_TIME_FRAME_OPTIONS,
  type AgendaTimeFrame,
} from "@/types/scheduled-interaction";

interface AgendaTimeFrameSwitcherProps {
  timeFrame: AgendaTimeFrame;
  onTimeFrameChange: (value: AgendaTimeFrame) => void;
}

export function AgendaTimeFrameSwitcher({
  timeFrame,
  onTimeFrameChange,
}: AgendaTimeFrameSwitcherProps) {
  return (
    <div
      className="grid grid-cols-4 gap-0.5 rounded-xl border-[1.5px] border-border-green bg-elevated p-0.5"
      role="tablist"
      aria-label="Agenda time frame"
    >
      {AGENDA_TIME_FRAME_OPTIONS.map((option) => {
        const active = timeFrame === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTimeFrameChange(option.value)}
            className={`rounded-[0.65rem] px-3 py-2.5 text-sm font-normal transition-colors ${
              active
                ? "bg-accent-green-muted text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
