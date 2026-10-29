"use client";

import Link from "next/link";
import {
  behavioralTagPillClass,
  formatBehavioralTagLabel,
} from "@/lib/psychological-profile";
import { formatAgendaEventTime } from "@/lib/agenda/time-frame";
import { AGENDA_ITEM_SELECTED_CLASS } from "@/components/agenda/agenda-panel-styles";
import { CalendarSourceBadge } from "@/components/calendar/CalendarSourceBadge";
import {
  isLinkedContactId,
  type ScheduledInteraction,
} from "@/types/scheduled-interaction";

interface AgendaBriefingCardProps {
  interaction: ScheduledInteraction;
  isSelected?: boolean;
  onEdit?: (interaction: ScheduledInteraction) => void;
}

export function AgendaBriefingCard({
  interaction,
  isSelected = false,
  onEdit,
}: AgendaBriefingCardProps) {
  const eventTime = formatAgendaEventTime(interaction.scheduledAt);
  const hasContactLink = isLinkedContactId(interaction.contactId);

  return (
    <article
      id={`agenda-event-${interaction.id}`}
      className={`ui-card flex scroll-mt-4 flex-col gap-3 px-4 py-4 transition-shadow ${
        isSelected ? AGENDA_ITEM_SELECTED_CLASS : ""
      } ${onEdit ? "cursor-pointer" : ""}`}
      onClick={onEdit ? () => onEdit(interaction) : undefined}
      onKeyDown={
        onEdit
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEdit(interaction);
              }
            }
          : undefined
      }
      role={onEdit ? "button" : undefined}
      tabIndex={onEdit ? 0 : undefined}
    >
      <div className="flex items-start gap-3">
        <time
          dateTime={interaction.scheduledAt}
          className="shrink-0 pt-0.5 font-mono text-sm font-medium text-accent-orange"
        >
          {eventTime}
        </time>

        <div className="min-w-0 flex-1">
          {hasContactLink ? (
            <Link
              href={`/contacts/${interaction.contactId}`}
              className="block truncate font-sans text-base font-medium text-foreground transition-colors hover:text-accent-green"
              onClick={(event) => event.stopPropagation()}
            >
              {interaction.contactName}
            </Link>
          ) : (
            <p className="block truncate font-sans text-base font-medium text-foreground">
              {interaction.contactName}
            </p>
          )}
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <h3 className="truncate font-sans text-sm text-muted">
              {interaction.title}
            </h3>
            <CalendarSourceBadge source={interaction.source} />
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
