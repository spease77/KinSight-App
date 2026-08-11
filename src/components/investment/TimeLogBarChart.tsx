"use client";

import type { InvestmentContactSummary } from "@/types/time-log";
import { formatDurationMinutes, hasLoggedTimeInvested } from "@/lib/time-logs/format-duration";

interface TimeLogBarChartProps {
  contacts: InvestmentContactSummary[];
}

export function TimeLogBarChart({ contacts }: TimeLogBarChartProps) {
  const sorted = [...contacts]
    .filter((contact) => hasLoggedTimeInvested(contact.totalMinutes))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
  const maxMinutes = sorted[0]?.totalMinutes ?? 0;

  if (sorted.length === 0) {
    return null;
  }

  const cumulativeTotal = sorted.reduce(
    (sum, contact) => sum + contact.totalMinutes,
    0
  );

  return (
    <section
      aria-label="Time spent by contact"
      className="ui-card flex flex-col gap-4 p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="type-section-title font-sans text-sm tracking-tight text-foreground">
          Time by contact
        </h2>
        <p className="type-meta shrink-0">
          {formatDurationMinutes(cumulativeTotal)} total
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((contact) => {
          const width =
            maxMinutes > 0
              ? Math.max(6, (contact.totalMinutes / maxMinutes) * 100)
              : 0;
          const label = `${contact.firstName} ${contact.lastName}`.trim();

          return (
            <div key={contact.contactId} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-foreground">{label}</span>
                <span className="shrink-0 font-mono text-muted">
                  {formatDurationMinutes(contact.totalMinutes)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-card-hover">
                <div
                  className="h-full rounded-full bg-accent-green transition-all"
                  style={{ width: `${width}%` }}
                  role="presentation"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
