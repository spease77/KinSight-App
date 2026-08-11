import { INTERACTION_SOURCE_LABELS } from "@/types/scheduled-interaction";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";

function interactionSearchText(interaction: ScheduledInteraction): string {
  return [
    interaction.contactName,
    interaction.title,
    interaction.notes ?? "",
    INTERACTION_SOURCE_LABELS[interaction.source],
  ]
    .join(" ")
    .toLowerCase();
}

export function filterInteractionsByQuery(
  interactions: ScheduledInteraction[],
  query: string
): ScheduledInteraction[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return interactions;

  return interactions.filter((interaction) =>
    interactionSearchText(interaction).includes(normalized)
  );
}
