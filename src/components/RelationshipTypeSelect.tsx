"use client";

import {
  RELATIONSHIP_TYPE_GROUPS,
  type RelationshipType,
} from "@/lib/contacts/relationship-tree";

interface RelationshipTypeSelectProps {
  value: RelationshipType | "";
  onChange: (value: RelationshipType | "") => void;
  id?: string;
  disabled?: boolean;
  label?: string;
}

export function RelationshipTypeSelect({
  value,
  onChange,
  id,
  disabled = false,
  label = "Relationship type",
}: RelationshipTypeSelectProps) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      <span className="ui-label">{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value as RelationshipType | "")
        }
        className="ui-input w-full py-2.5 text-sm"
      >
        <option value="">Select type…</option>
        {RELATIONSHIP_TYPE_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
