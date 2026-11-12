"use client";

import {
  RELATIONSHIP_VELOCITY_LABELS,
  relationshipVelocityFromDate,
} from "@/lib/contacts/intelligence-profile";

interface RelationshipGaugeProps {
  lastInteractionDate?: string | null;
  compact?: boolean;
}

export function RelationshipGauge({
  lastInteractionDate,
  compact = false,
}: RelationshipGaugeProps) {
  const velocity = relationshipVelocityFromDate(lastInteractionDate);
  const label = RELATIONSHIP_VELOCITY_LABELS[velocity];

  return (
    <div
      className={`relationship-gauge${compact ? " relationship-gauge--compact" : ""}`}
    >
      <span
        className={`relationship-gauge__badge relationship-gauge__badge--${velocity}`}
      >
        {label}
      </span>
    </div>
  );
}
