import { Sparkles } from "lucide-react";
import {
  calendarSourceLabel,
  type InteractionSource,
} from "@/types/scheduled-interaction";

function GoogleCalendarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#fff"
        d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
      />
      <path fill="#1A73E8" d="M5 3h14v4H5z" />
      <path fill="#EA4335" d="M7 1h2v5H7z" />
      <path fill="#EA4335" d="M15 1h2v5h-2z" />
      <path
        fill="#1A73E8"
        d="M10.2 10.1c.7-.6 1.6-.9 2.6-.9 1 0 1.8.3 2.4.8.6.6.9 1.3.9 2.2h-1.8c0-.5-.2-.9-.5-1.2-.3-.3-.8-.5-1.3-.5-.6 0-1 .2-1.4.6-.4.4-.6 1-.6 1.8s.2 1.4.6 1.8c.4.4.8.6 1.4.6.6 0 1-.2 1.3-.5.3-.3.5-.7.5-1.2h1.8c0 .9-.3 1.7-.9 2.2-.6.6-1.4.9-2.4.9-1 0-1.9-.3-2.6-.9-.7-.7-1-1.6-1-2.9 0-1.2.3-2.2 1-2.8z"
      />
    </svg>
  );
}

function OutlookCalendarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#0078D4" />
      <path
        fill="#fff"
        d="M8.2 8.2h2.1c1.8 0 2.9 1 2.9 2.6 0 1.7-1.2 2.7-3 2.7H9.5V16H8.2V8.2zm2 4.1c.8 0 1.4-.5 1.4-1.4S11 9.5 10.2 9.5H9.5v2.8h.7z"
      />
    </svg>
  );
}

export function CalendarSourceBadge({
  source,
  compact = false,
}: {
  source: InteractionSource;
  compact?: boolean;
}) {
  const label = calendarSourceLabel(source);

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-green/50 bg-elevated px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted"
      title={label}
      aria-label={label}
    >
      {source === "google" ? (
        <GoogleCalendarMark className="h-3.5 w-3.5" />
      ) : source === "outlook" ? (
        <OutlookCalendarMark className="h-3.5 w-3.5" />
      ) : (
        <Sparkles className="h-3 w-3 text-accent-green" strokeWidth={2.25} />
      )}
      {compact ? null : label}
    </span>
  );
}
