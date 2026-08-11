"use client";

import Link from "next/link";
import {
  behavioralTagPillClass,
  formatBehavioralTagLabel,
} from "@/lib/psychological-profile";
import { formatAgendaEventTime } from "@/lib/agenda/time-frame";
import { AGENDA_ITEM_SELECTED_CLASS } from "@/components/agenda/agenda-panel-styles";
import {
  INTERACTION_SOURCE_LABELS,
  type ScheduledInteraction,
} from "@/types/scheduled-interaction";

interface AgendaBriefingCardProps {
  interaction: ScheduledInteraction;
  isSelected?: boolean;
}

export function AgendaBriefingCard({
  interaction,
  isSelected = false,
}: AgendaBriefingCardProps) {
  const eventTime = formatAgendaEventTime(interaction.scheduledAt);
  const isMockContact = interaction.contactId.startsWith("mock-");
  const showSourceBadge = interaction.source !== "kinsight";

  return (
    <article
      id={`agenda-event-${interaction.id}`}
      className={`ui-card flex scroll-mt-4 flex-col gap-3 px-4 py-4 transition-shadow ${
        isSelected ? AGENDA_ITEM_SELECTED_CLASS : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <time
          dateTime={interaction.scheduledAt}
          className="shrink-0 pt-0.5 font-mono text-sm font-medium text-accent-orange"
        >
          {eventTime}
        </time>

        <div className="min-w-0 flex-1">
          {isMockContact ? (
            <p className="block truncate font-sans text-base font-medium text-foreground">
              {interaction.contactName}
            </p>
          ) : (
            <Link
              href={`/contacts/${interaction.contactId}`}
              className="block truncate font-sans text-base font-medium text-foreground transition-colors hover:text-accent-green"
            >
              {interaction.contactName}
            </Link>
          )}
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <h3 className="truncate font-sans text-sm text-muted">
              {interaction.title}
            </h3>
            {showSourceBadge && (
              <span className="shrink-0 rounded-full border border-border-green/50 bg-elevated px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                {INTERACTION_SOURCE_LABELS[interaction.source]}
              </span>
            )}
          </div>
        </div>
      </div>

      {interaction.behavioralTags.length > 0 && (
        <ul
          className="flex flex-wrap gap-2"
          aria-label="Behavioral indicators"
        >
          {interaction.behavioralTags.map((tag) => (
            <li key={tag}>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${behavioralTagPillClass(tag)}`}
              >
                {formatBehavioralTagLabel(tag)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
