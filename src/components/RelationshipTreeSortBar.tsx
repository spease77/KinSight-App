"use client";

import { ArrowDownAZ, ArrowUpAZ, Clock } from "lucide-react";

/** Plain sort bar direction control trailing margin (0.25rem). */
export const PLAIN_SORT_DIRECTION_INSET = "mr-1";

/**
 * Shared left inset for plain sort bars and aligned contact lists (0.75rem).
 * Keeps the first sort tab and list rows on the same vertical axis.
 */
export const PLAIN_SORT_CONTENT_INSET = "pl-3";

/** Contact list inset aligned to the first plain sort tab's left edge. */
export const PLAIN_SORT_ALIGNED_LIST_INSET = PLAIN_SORT_CONTENT_INSET;

interface RelationshipTreeSortBarProps<T extends string> {
  sortField: T;
  sortDirection: "asc" | "desc";
  fields: readonly { value: T; label: string }[];
  onSortFieldChange: (field: T) => void;
  onSortDirectionToggle: () => void;
  variant?: "card" | "plain";
}

export function RelationshipTreeSortBar<T extends string>({
  sortField,
  sortDirection,
  fields,
  onSortFieldChange,
  onSortDirectionToggle,
  variant = "card",
}: RelationshipTreeSortBarProps<T>) {
  const DirectionIcon = sortDirection === "asc" ? ArrowDownAZ : ArrowUpAZ;
  const directionLabel = sortDirection === "asc" ? "A to Z" : "Z to A";
  const isPlain = variant === "plain";

  return (
    <div
      className={
        isPlain
          ? `flex flex-nowrap items-center gap-1 ${PLAIN_SORT_CONTENT_INSET}`
          : "ui-card flex flex-wrap items-center gap-2 p-1"
      }
      role="group"
      aria-label="Sort contacts"
    >
      {fields.map((field) => {
        const active = sortField === field.value;
        const isTimeField = field.value === "time";

        return (
          <button
            key={field.value}
            type="button"
            onClick={() => onSortFieldChange(field.value)}
            aria-pressed={active}
            aria-label={isTimeField && isPlain ? "Time" : undefined}
            className={
              isPlain
                ? isTimeField
                  ? `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      active
                        ? "ui-badge-green"
                        : "text-muted hover:text-foreground"
                    }`
                  : `min-w-0 flex-1 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-xs font-normal transition-colors ${
                      active
                        ? "ui-badge-green px-2 py-1 text-xs"
                        : "text-muted hover:text-foreground"
                    }`
                : `rounded-lg px-3 py-1.5 text-xs font-normal transition-colors ${
                    active
                      ? "ui-badge-green px-2.5 py-1 text-xs"
                      : "text-muted hover:text-foreground"
                  }`
            }
          >
            {isTimeField && isPlain ? (
              <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            ) : (
              field.label
            )}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onSortDirectionToggle}
        aria-label={`Sort ${directionLabel}. Tap to reverse.`}
        title={`Sort ${directionLabel}`}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-icon transition-colors hover:bg-accent-green-muted hover:text-foreground${
          isPlain ? ` ${PLAIN_SORT_DIRECTION_INSET}` : ""
        }`}
      >
        <DirectionIcon className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

export const CONTACT_SORT_FIELDS = [
  { value: "first", label: "First name" },
  { value: "last", label: "Last name" },
  { value: "relationship", label: "Relationship" },
] as const;

export const INVESTMENT_CONTACT_SORT_FIELDS = [
  { value: "first", label: "First name" },
  { value: "last", label: "Last name" },
  { value: "relationship", label: "Relationship" },
  { value: "time", label: "Time" },
] as const;

export const RELATIONSHIP_TREE_SORT_FIELDS = [
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "relationshipType", label: "Relationship" },
] as const;
