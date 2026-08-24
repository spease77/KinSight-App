"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, ChevronRight } from "lucide-react";
import {
  AGENDA_LIST_SORT_FIELDS,
  getInteractionMeetingLabel,
  sortAgendaInteractions,
  toggleAgendaListSortDirection,
  type AgendaListSortDirection,
  type AgendaListSortField,
} from "@/lib/agenda/sort-interactions";
import {
  formatAgendaDateHeader,
  formatAgendaEventTime,
} from "@/lib/agenda/time-frame";
import {
  INTERACTION_SOURCE_LABELS,
  type ScheduledInteraction,
} from "@/types/scheduled-interaction";

interface AgendaListViewProps {
  interactions: ScheduledInteraction[];
  onInteractionEdit: (interaction: ScheduledInteraction) => void;
  emptyMessage?: string;
}

function AgendaListSortBar({
  sortBy,
  sortDirection,
  onSortByChange,
  onSortDirectionToggle,
}: {
  sortBy: AgendaListSortField;
  sortDirection: AgendaListSortDirection;
  onSortByChange: (field: AgendaListSortField) => void;
  onSortDirectionToggle: () => void;
}) {
  const DirectionIcon = sortDirection === "asc" ? ArrowDownAZ : ArrowUpAZ;
  const directionLabel = sortDirection === "asc" ? "ascending" : "descending";

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Sort appointments by"
    >
      {AGENDA_LIST_SORT_FIELDS.map((field) => {
        const active = sortBy === field.value;

        return (
          <button
            key={field.value}
            type="button"
            onClick={() => onSortByChange(field.value)}
            aria-pressed={active}
            className={`rounded-lg px-3 py-1.5 text-xs font-normal transition-colors ${
              active
                ? "ui-badge-green px-2.5 py-1 text-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            {field.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onSortDirectionToggle}
        aria-label={`Sort ${directionLabel}. Tap to reverse.`}
        title={`Sort ${directionLabel}`}
        className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-icon transition-colors hover:bg-accent-green-muted hover:text-foreground"
      >
        <DirectionIcon className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function AgendaListRow({
  interaction,
  onEdit,
}: {
  interaction: ScheduledInteraction;
  onEdit: (interaction: ScheduledInteraction) => void;
}) {
  const eventDate = new Date(interaction.scheduledAt);
  const eventTime = formatAgendaEventTime(interaction.scheduledAt);
  const eventDateLabel = formatAgendaDateHeader(eventDate);
  const meetingLabel = getInteractionMeetingLabel(interaction);
  const showSourceBadge = interaction.source !== "kinsight";
  const isMockContact = interaction.contactId.startsWith("mock-");

  return (
    <li>
      <button
        type="button"
        onClick={() => onEdit(interaction)}
        className="contact-list-row group flex w-full cursor-pointer touch-manipulation items-center gap-4 py-3 text-left active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-sm font-normal text-foreground">
            {interaction.title}
          </p>
          <p className="mt-0.5 truncate text-xs font-normal text-zinc-400">
            {eventDateLabel}
            <span className="mx-1.5" aria-hidden="true">
              •
            </span>
            <time dateTime={interaction.scheduledAt}>{eventTime}</time>
            {!isMockContact && interaction.contactName ? (
              <>
                <span className="mx-1.5" aria-hidden="true">
                  •
                </span>
                {interaction.contactName}
              </>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <span className="ui-badge-green px-2.5 py-1 text-xs">{meetingLabel}</span>
          {showSourceBadge ? (
            <span className="hidden rounded-full border border-border-green/50 bg-elevated px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted sm:inline">
              {INTERACTION_SOURCE_LABELS[interaction.source]}
            </span>
          ) : null}
          <ChevronRight
            className="h-5 w-5 shrink-0 text-icon transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>
      </button>
    </li>
  );
}

export function AgendaListView({
  interactions,
  onInteractionEdit,
  emptyMessage,
}: AgendaListViewProps) {
  const [sortBy, setSortBy] = useState<AgendaListSortField>("date");
  const [sortDirection, setSortDirection] =
    useState<AgendaListSortDirection>("asc");

  const sortedInteractions = useMemo(
    () => sortAgendaInteractions(interactions, sortBy, sortDirection),
    [interactions, sortBy, sortDirection]
  );

  const handleDirectionToggle = () => {
    setSortDirection((current) => toggleAgendaListSortDirection(current));
  };

  if (interactions.length === 0) {
    if (emptyMessage) {
      return (
        <p className="type-editorial py-8 text-center text-sm text-muted">
          {emptyMessage}
        </p>
      );
    }

    return (
      <div className="type-editorial flex flex-col gap-2 py-8 text-center text-sm text-muted">
        <p>Nothing scheduled.</p>
        <p>Use &apos;+&apos; button or home mic to add.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="type-meta px-1">
        {interactions.length}{" "}
        {interactions.length === 1 ? "appointment" : "appointments"}
      </p>

      <AgendaListSortBar
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortByChange={setSortBy}
        onSortDirectionToggle={handleDirectionToggle}
      />

      <ul className="agenda-list-scroll contact-list-card contacts-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        {sortedInteractions.map((interaction) => (
          <AgendaListRow
            key={interaction.id}
            interaction={interaction}
            onEdit={onInteractionEdit}
          />
        ))}
      </ul>
    </div>
  );
}
