export type BehavioralProfileTag =
  | "significance"
  | "approval"
  | "acceptance"
  | "intelligence"
  | "status"
  | "ideology"
  | "money"
  | "coercion";

export type BehavioralPillColor = "orange" | "blue" | "green";

export const CHASE_HUGHES_CORE_NEEDS: {
  value: BehavioralProfileTag;
  label: string;
}[] = [
  { value: "significance", label: "Significance" },
  { value: "approval", label: "Approval" },
  { value: "acceptance", label: "Acceptance" },
  { value: "intelligence", label: "Intelligence" },
];

export const BUSTAMANTE_SADIE_DRIVERS: {
  value: BehavioralProfileTag;
  label: string;
}[] = [
  { value: "status", label: "Status" },
  { value: "ideology", label: "Ideology" },
  { value: "money", label: "Money" },
  { value: "coercion", label: "Coercion" },
];

const TAG_LABELS: Record<BehavioralProfileTag, string> = {
  significance: "Significance",
  approval: "Approval",
  acceptance: "Acceptance",
  intelligence: "Intelligence",
  status: "Status",
  ideology: "Ideology",
  money: "Money",
  coercion: "Coercion",
};

const TAG_ALIASES: Record<string, BehavioralProfileTag> = {
  significance: "significance",
  approval: "approval",
  acceptance: "acceptance",
  intelligence: "intelligence",
  status: "status",
  ideology: "ideology",
  money: "money",
  coercion: "coercion",
};

const PROFILE_TAG_KEYS = [
  "coreNeed",
  "coreNeeds",
  "chaseHughesCoreNeed",
  "sadieDriver",
  "sadieDrivers",
  "bustamanteSadieDriver",
] as const;

export function normalizeBehavioralTag(
  value: string
): BehavioralProfileTag | null {
  const key = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return TAG_ALIASES[key] ?? null;
}

export function formatBehavioralTagLabel(tag: BehavioralProfileTag): string {
  return TAG_LABELS[tag];
}

export function behavioralTagPillColor(
  tag: BehavioralProfileTag
): BehavioralPillColor {
  switch (tag) {
    case "significance":
    case "status":
    case "coercion":
      return "orange";
    case "intelligence":
    case "money":
      return "blue";
    case "approval":
    case "acceptance":
    case "ideology":
      return "green";
    default:
      return "orange";
  }
}

export function behavioralTagPillClass(tag: BehavioralProfileTag): string {
  const color = behavioralTagPillColor(tag);
  if (color === "blue") return "ui-badge-blue";
  if (color === "green") return "ui-badge-green";
  return "ui-badge-orange";
}

function parseTagValues(raw: string): BehavioralProfileTag[] {
  return raw
    .split(/[,;|/]+/)
    .map((part) => normalizeBehavioralTag(part))
    .filter((tag): tag is BehavioralProfileTag => tag !== null);
}

export function extractBehavioralTagsFromProfile(
  profile: Record<string, string> | null | undefined
): BehavioralProfileTag[] {
  if (!profile) return [];

  const found = new Set<BehavioralProfileTag>();

  for (const key of PROFILE_TAG_KEYS) {
    const raw = profile[key];
    if (!raw?.trim()) continue;
    for (const tag of parseTagValues(raw)) {
      found.add(tag);
    }
  }

  return Array.from(found);
}

export function resolveInteractionBehavioralTags(input: {
  storedTags?: string[] | null;
  profile?: Record<string, string> | null;
}): BehavioralProfileTag[] {
  const fromStored = (input.storedTags ?? [])
    .map((tag) => normalizeBehavioralTag(tag))
    .filter((tag): tag is BehavioralProfileTag => tag !== null);

  if (fromStored.length > 0) {
    return Array.from(new Set(fromStored));
  }

  return extractBehavioralTagsFromProfile(input.profile);
}
