import type { ContactProfile } from "@/types/contact-profile";

export const INTELLIGENCE_PROFILE_KEY = "__kinsightIntelligenceProfile";

export const COMMUNICATION_STYLES = [
  "Concise / Executive",
  "Relational / Detailed",
  "Analyst / Technical",
] as const;

export const PRIMARY_DRIVERS = [
  "Recognition",
  "Market Share",
  "Operational Speed",
  "Cost Control",
] as const;

export const RELATIONSHIP_VELOCITIES = ["warm", "cooling", "cold"] as const;

export type CommunicationStyle = (typeof COMMUNICATION_STYLES)[number];
export type PrimaryDriver = (typeof PRIMARY_DRIVERS)[number];
export type RelationshipVelocity = (typeof RELATIONSHIP_VELOCITIES)[number];

export type IntelligenceProfile = {
  communication_style: CommunicationStyle | null;
  primary_driver: PrimaryDriver | null;
  personal_context: string[];
  objections_and_fears: string[];
  last_interaction_date: string | null;
  relationship_velocity: RelationshipVelocity;
};

export type PreMeetingCard = {
  summary: string;
  top_questions: string[];
  caution_flags: string[];
  opening_move: string;
  generated_at: string;
};

export const EMPTY_INTELLIGENCE_PROFILE: IntelligenceProfile = {
  communication_style: null,
  primary_driver: null,
  personal_context: [],
  objections_and_fears: [],
  last_interaction_date: null,
  relationship_velocity: "cold",
};

const WARM_DAYS = 14;
const COOLING_DAYS = 45;

export function relationshipVelocityFromDate(
  lastInteractionDate: string | null | undefined
): RelationshipVelocity {
  if (!lastInteractionDate) return "cold";
  const parsed = Date.parse(lastInteractionDate);
  if (!Number.isFinite(parsed)) return "cold";
  const days = (Date.now() - parsed) / (24 * 60 * 60 * 1000);
  if (days <= WARM_DAYS) return "warm";
  if (days <= COOLING_DAYS) return "cooling";
  return "cold";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const entry of value) {
    const text = typeof entry === "string" ? entry.trim() : "";
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(text);
  }
  return items;
}

function asCommunicationStyle(value: unknown): CommunicationStyle | null {
  return COMMUNICATION_STYLES.includes(value as CommunicationStyle)
    ? (value as CommunicationStyle)
    : null;
}

function asPrimaryDriver(value: unknown): PrimaryDriver | null {
  return PRIMARY_DRIVERS.includes(value as PrimaryDriver)
    ? (value as PrimaryDriver)
    : null;
}

export function parseIntelligenceProfile(
  raw: unknown
): IntelligenceProfile | null {
  if (!raw) return null;
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const lastInteraction =
    typeof record.last_interaction_date === "string" &&
    record.last_interaction_date.trim()
      ? record.last_interaction_date.trim()
      : null;

  return {
    communication_style: asCommunicationStyle(record.communication_style),
    primary_driver: asPrimaryDriver(record.primary_driver),
    personal_context: asStringArray(record.personal_context),
    objections_and_fears: asStringArray(record.objections_and_fears),
    last_interaction_date: lastInteraction,
    relationship_velocity: relationshipVelocityFromDate(lastInteraction),
  };
}

export function parsePreMeetingCard(raw: unknown): PreMeetingCard | null {
  if (!raw) return null;
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const summary = typeof record.summary === "string" ? record.summary.trim() : "";
  const opening =
    typeof record.opening_move === "string" ? record.opening_move.trim() : "";
  if (!summary || !opening) return null;
  return {
    summary,
    top_questions: asStringArray(record.top_questions).slice(0, 2),
    caution_flags: asStringArray(record.caution_flags).slice(0, 3),
    opening_move: opening,
    generated_at:
      typeof record.generated_at === "string" && record.generated_at.trim()
        ? record.generated_at.trim()
        : new Date().toISOString(),
  };
}

export function mergeStringLists(
  current: string[],
  incoming: string[]
): string[] {
  const seen = new Set(current.map((item) => item.toLowerCase()));
  const merged = [...current];
  for (const item of incoming) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(trimmed);
  }
  return merged;
}

export function mergeIntelligenceProfile(
  current: IntelligenceProfile | null,
  patch: Partial<IntelligenceProfile>
): IntelligenceProfile {
  const base = current ?? { ...EMPTY_INTELLIGENCE_PROFILE };
  const lastInteraction =
    patch.last_interaction_date?.trim() || base.last_interaction_date;
  return {
    communication_style:
      patch.communication_style ?? base.communication_style,
    primary_driver: patch.primary_driver ?? base.primary_driver,
    personal_context: mergeStringLists(
      base.personal_context,
      patch.personal_context ?? []
    ),
    objections_and_fears: mergeStringLists(
      base.objections_and_fears,
      patch.objections_and_fears ?? []
    ),
    last_interaction_date: lastInteraction,
    relationship_velocity: relationshipVelocityFromDate(lastInteraction),
  };
}

export function intelligenceFromProfile(
  profile: ContactProfile | null | undefined
): IntelligenceProfile | null {
  return parseIntelligenceProfile(profile?.[INTELLIGENCE_PROFILE_KEY]);
}
