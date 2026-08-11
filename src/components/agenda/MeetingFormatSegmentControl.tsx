"use client";

import type { MeetingFormatSegment } from "@/types/agenda-meeting";
import { MEETING_FORMAT_SEGMENTS } from "@/types/agenda-meeting";

interface MeetingFormatSegmentProps {
  value: MeetingFormatSegment;
  onChange: (value: MeetingFormatSegment) => void;
  disabled?: boolean;
}

export function MeetingFormatSegmentControl({
  value,
  onChange,
  disabled = false,
}: MeetingFormatSegmentProps) {
  return (
    <div
      className="meeting-segment-track flex gap-1 rounded-2xl border border-border-green/40 bg-elevated/80 p-1"
      role="tablist"
      aria-label="Meeting format"
    >
      {MEETING_FORMAT_SEGMENTS.map((segment) => {
        const active = value === segment.value;
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(segment.value)}
            className={`meeting-segment-button flex-1 rounded-xl px-2 py-2.5 text-center text-[11px] font-medium leading-tight transition-all duration-200 disabled:opacity-40 sm:text-xs ${
              active ? "meeting-segment-button--active" : "text-muted"
            }`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
