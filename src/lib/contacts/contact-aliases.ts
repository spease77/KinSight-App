import type { ContactProfile } from "@/types/contact-profile";

export const KINSIGHT_ALIASES_KEY = "__kinsightAliases";

const CONFIDENCE_THRESHOLD = 0.85;

export const CONTACT_RESOLUTION_THRESHOLD = CONFIDENCE_THRESHOLD;

function normalizeAlias(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function parseStoredAliases(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return uniqueAliases(raw.filter((item): item is string => typeof item === "string"));
  }
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return uniqueAliases(
      parsed.filter((item): item is string => typeof item === "string")
    );
  } catch {
    return uniqueAliases(raw.split(","));
  }
}

export function uniqueAliases(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const value of values) {
    const trimmed = normalizeAlias(value ?? "");
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    aliases.push(trimmed);
  }
  return aliases;
}

export function readProfileAliases(profile: ContactProfile | undefined): string[] {
  if (!profile) return [];
  return parseStoredAliases(profile[KINSIGHT_ALIASES_KEY]);
}

export function writeProfileAliases(
  profile: ContactProfile,
  aliases: string[]
): ContactProfile {
  const next = uniqueAliases(aliases);
  if (next.length === 0) {
    const { [KINSIGHT_ALIASES_KEY]: _removed, ...rest } = profile;
    return rest;
  }
  return {
    ...profile,
    [KINSIGHT_ALIASES_KEY]: JSON.stringify(next),
  };
}

export function mergeAliasLists(
  ...groups: Array<Array<string | null | undefined> | null | undefined>
): string[] {
  return uniqueAliases(groups.flatMap((group) => group ?? []));
}

export function seedAliasesFromName(
  fullName: string,
  extra?: Array<string | null | undefined>
): string[] {
  const trimmed = normalizeAlias(fullName);
  const parts = trimmed.split(" ").filter(Boolean);
  const firstName = parts[0] ?? "";
  const extras = extra ?? [];
  return uniqueAliases([
    firstName && firstName.toLowerCase() !== trimmed.toLowerCase()
      ? firstName
      : "",
    ...extras,
  ]);
}
