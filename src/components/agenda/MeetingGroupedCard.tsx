"use client";

interface MeetingGroupedCardProps {
  children: React.ReactNode;
  className?: string;
}

export function MeetingGroupedCard({
  children,
  className = "",
}: MeetingGroupedCardProps) {
  return (
    <div
      className={`meeting-group-card divide-y divide-border-green/40 overflow-hidden rounded-2xl border border-border-green/50 bg-card/70 ${className}`}
    >
      {children}
    </div>
  );
}

interface MeetingGroupedRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function MeetingGroupedRow({
  label,
  children,
  className = "",
}: MeetingGroupedRowProps) {
  return (
    <div
      className={`flex min-h-[3.25rem] items-center justify-between gap-4 px-4 py-3 ${className}`}
    >
      <span className="shrink-0 text-[15px] text-foreground">{label}</span>
      <div className="min-w-0 flex-1 text-right">{children}</div>
    </div>
  );
}
