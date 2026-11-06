"use client";

import { showSuccessToast } from "@/lib/ui/toast";
import {
  RELATIONSHIP_VELOCITY_LABELS,
  relationshipVelocityFromDate,
} from "@/lib/contacts/intelligence-profile";
import { openWarmUpDraft } from "@/lib/contacts/warm-up-message";
import type { ContactProfile } from "@/types/contact-profile";

interface RelationshipGaugeProps {
  contactName: string;
  lastInteractionDate?: string | null;
  email?: string | null;
  profile?: ContactProfile | null;
  compact?: boolean;
}

export function RelationshipGauge({
  contactName,
  lastInteractionDate,
  email,
  profile,
  compact = false,
}: RelationshipGaugeProps) {
  const velocity = relationshipVelocityFromDate(lastInteractionDate);
  const label = RELATIONSHIP_VELOCITY_LABELS[velocity];
  const showWarmUp = velocity === "cooling" || velocity === "cold";

  return (
    <div
      className={`relationship-gauge${compact ? " relationship-gauge--compact" : ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <span
        className={`relationship-gauge__badge relationship-gauge__badge--${velocity}`}
      >
        {label}
      </span>
      {showWarmUp ? (
        <button
          type="button"
          className="relationship-gauge__warmup"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const result = openWarmUpDraft({
              contactName,
              email,
              profile,
            });
            if (result === "copied") {
              showSuccessToast("Warm-up message copied.");
            }
          }}
        >
          Draft Warm-Up Message
        </button>
      ) : null}
    </div>
  );
}
