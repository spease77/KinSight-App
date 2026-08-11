"use client";

import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";

interface RelationshipTreeSortBarProps<T extends string> {
  sortField: T;
  sortDirection: "asc" | "desc";
  fields: readonly { value: T; label: string }[];
  onSortFieldChange: (field: T) => void;
  onSortDirectionToggle: () => void;
}

export function RelationshipTreeSortBar<T extends string>({
  sortField,
  sortDirection,
  fields,
  onSortFieldChange,
  onSortDirectionToggle,
}: RelationshipTreeSortBarProps<T>) {
  const DirectionIcon = sortDirection === "asc" ? ArrowDownAZ : ArrowUpAZ;
  const directionLabel = sortDirection === "asc" ? "A to Z" : "Z to A";

  return (
    <div
      className="ui-card flex flex-wrap items-center gap-2 p-1"
      role="group"
      aria-label="Sort contacts"
    >
      <button
        type="button"
        onClick={onSortDirectionToggle}
        aria-label={`Sort ${directionLabel}. Tap to reverse.`}
        title={`Sort ${directionLabel}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-icon transition-colors hover:bg-accent-green-muted hover:text-foreground"
      >
        <DirectionIcon className="h-4 w-4" strokeWidth={2} />
      </button>
      {fields.map((field) => {
        const active = sortField === field.value;

        return (
          <button
            key={field.value}
            type="button"
            onClick={() => onSortFieldChange(field.value)}
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
