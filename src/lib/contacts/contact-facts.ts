import type { ContactProfile } from "@/types/contact-profile";
import { normalizeRelationshipFacts } from "@/lib/contacts/relationship-tree";

export const KINSIGHT_CONTACT_FACTS_KEY = "__kinsightContactFacts";

export const CONTACT_FACT_CATEGORY_PRESETS = [
  "Favorite Drink",
  "Hobby Detail",
  "General Note",
] as const;

export type ContactFactCategory = (typeof CONTACT_FACT_CATEGORY_PRESETS)[number];

export function readContactFacts(profile: ContactProfile): string[] {
  const raw = profile[KINSIGHT_CONTACT_FACTS_KEY];
  if (!raw?.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeRelationshipFacts(parsed);
  } catch {
    return [];
  }
}

export function serializeContactFacts(facts: string[]): string | undefined {
  const cleaned = normalizeRelationshipFacts(facts);
  if (cleaned.length === 0) return undefined;
  return JSON.stringify(cleaned);
}

export function upsertContactFacts(
  profile: ContactProfile,
  facts: string[]
): ContactProfile {
  const incoming = normalizeRelationshipFacts(facts);
  if (incoming.length === 0) return profile;

  const current = readContactFacts(profile);
  const seen = new Set(current.map((fact) => fact.trim().toLowerCase()));
  const merged = [...current];
  for (const fact of incoming) {
    const key = fact.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    const covered = merged.some(
      (existing) =>
        existing.toLowerCase().includes(key) ||
        key.includes(existing.toLowerCase())
    );
    if (covered) continue;
    seen.add(key);
    merged.push(fact);
  }

  const serialized = serializeContactFacts(merged);
  if (!serialized) {
    const next = { ...profile };
    delete next[KINSIGHT_CONTACT_FACTS_KEY];
    return next;
  }

  return {
    ...profile,
    [KINSIGHT_CONTACT_FACTS_KEY]: serialized,
  };
}

export function formatFactWithCategory(
  category: ContactFactCategory | null,
  text: string
): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  if (!category) return trimmed;

  const prefix = `${category}: `;
  if (trimmed.toLowerCase().startsWith(category.toLowerCase())) {
    return trimmed;
  }

  return `${prefix}${trimmed}`;
}
