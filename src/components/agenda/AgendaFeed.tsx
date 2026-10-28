"use client";

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { AgendaBriefingCard } from "@/components/agenda/AgendaBriefingCard";
import type { AgendaDateGroup } from "@/lib/agenda/time-frame";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";

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

/** Same YYYY-MM-DD shape as the feed's group keys, so keys compare as text. */
function toPaddedDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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

      // The day itself (today unless another tab picked one) sits at the top,
      // header first. With nothing on that day, the next day that has events.
      const anchorDay = toPaddedDateKey(anchorDate ?? new Date());
      const targetGroup =
        groups.find((group) => group.dateKey >= anchorDay) ??
        groups[groups.length - 1];

      const header = document.getElementById(`agenda-${targetGroup.dateKey}`);
      if (!header) return;
      scroller.scrollTop =
        header.getBoundingClientRect().top -
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
                    onEdit={onInteractionEdit}
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
