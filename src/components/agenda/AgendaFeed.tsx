"use client";

import { forwardRef } from "react";
import { AgendaBriefingCard } from "@/components/agenda/AgendaBriefingCard";
import type { AgendaDateGroup } from "@/lib/agenda/time-frame";

interface AgendaFeedProps {
  groups: AgendaDateGroup[];
  selectedInteractionId: string | null;
  onDateHeaderSelect?: (dateKey: string) => void;
}

export const AgendaFeed = forwardRef<HTMLDivElement, AgendaFeedProps>(
  function AgendaFeed(
    { groups, selectedInteractionId, onDateHeaderSelect },
    ref
  ) {
    return (
      <div
        ref={ref}
        className="contacts-scroll flex max-h-[calc(100svh-28rem)] flex-col gap-5 overflow-y-auto pr-1"
      >
        {groups.map((group) => (
          <section
            key={group.dateKey}
            aria-labelledby={`agenda-${group.dateKey}`}
          >
            <button
              type="button"
              id={`agenda-${group.dateKey}`}
              onClick={() => onDateHeaderSelect?.(group.dateKey)}
              className="mb-3 block w-full text-left font-mono text-xs font-semibold tracking-[0.12em] text-foreground transition-colors hover:text-accent-green"
            >
              {group.label}
            </button>
            <ul className="flex flex-col gap-3">
              {group.items.map((item) => (
                <li key={item.id}>
                  <AgendaBriefingCard
                    interaction={item}
                    isSelected={selectedInteractionId === item.id}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }
);
