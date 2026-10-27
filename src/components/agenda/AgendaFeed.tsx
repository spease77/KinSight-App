"use client";

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { AgendaBriefingCard } from "@/components/agenda/AgendaBriefingCard";
import type { AgendaDateGroup } from "@/lib/agenda/time-frame";
import {
  isReadOnlyInteraction,
  type ScheduledInteraction,
} from "@/types/scheduled-interaction";

interface AgendaFeedProps {
  groups: AgendaDateGroup[];
  selectedInteractionId: string | null;
  onDateHeaderSelect?: (dateKey: string) => void;
  onInteractionEdit?: (interaction: ScheduledInteraction) => void;
  /** Day picked on another tab; the feed opens there (or at "now" for today). */
  anchorDate?: Date;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Right now when the picked day is today, otherwise the start of the picked day. */
function resolveAnchorTime(anchorDate: Date | undefined): number {
  const now = new Date();
  if (!anchorDate || localDateKey(anchorDate) === localDateKey(now)) {
    return now.getTime();
  }
  const start = new Date(anchorDate);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

function endsAfter(interaction: ScheduledInteraction, anchorTime: number) {
  const start = new Date(interaction.scheduledAt).getTime();
  const end = start + (interaction.durationMinutes ?? 0) * 60_000;
  return end >= anchorTime;
}

export const AgendaFeed = forwardRef<HTMLDivElement, AgendaFeedProps>(
  function AgendaFeed(
    {
      groups,
      selectedInteractionId,
      onDateHeaderSelect,
      onInteractionEdit,
      anchorDate,
    },
    ref
  ) {
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const userScrolledRef = useRef(false);
    const appliedKeyRef = useRef<string | null>(null);

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        scrollerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    const anchorKey = anchorDate ? localDateKey(anchorDate) : "today";
    const itemCount = groups.reduce((sum, group) => sum + group.items.length, 0);

    // Open at "now" (or the day picked on another tab) instead of the oldest
    // event; earlier events stay reachable by scrolling up.
    useLayoutEffect(() => {
      const scroller = scrollerRef.current;
      if (!scroller || itemCount === 0) return;

      if (appliedKeyRef.current !== anchorKey) {
        appliedKeyRef.current = anchorKey;
        userScrolledRef.current = false;
      } else if (userScrolledRef.current) {
        return; // late-arriving events must not yank a feed being read
      }

      const anchorTime = resolveAnchorTime(anchorDate);
      const items = groups.flatMap((group) => group.items);
      const target = items.find((item) => endsAfter(item, anchorTime));

      if (!target) {
        scroller.scrollTop = scroller.scrollHeight;
        return;
      }

      const card = document.getElementById(`agenda-event-${target.id}`);
      if (!card) return;
      scroller.scrollTop =
        card.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop;
    }, [groups, itemCount, anchorDate, anchorKey]);

    const markUserScrolled = () => {
      userScrolledRef.current = true;
    };

    return (
      <div
        ref={setRefs}
        onTouchStart={markUserScrolled}
        onWheel={markUserScrolled}
        className="agenda-feed-scroll contacts-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 pb-[100px]"
      >
        {groups.map((group) => (
          <section
            key={group.dateKey}
            aria-labelledby={`agenda-${group.dateKey}`}
            className="shrink-0"
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
                    onEdit={
                      isReadOnlyInteraction(item) ? undefined : onInteractionEdit
                    }
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
