import type { ContactProfile } from "@/types/contact-profile";
import {
  applyRelationshipLabelToEntry,
  formatRelationshipLabelDisplay,
  relationshipTypeToPresetLabel,
} from "@/lib/contacts/relationship-label-presets";
import {
  createEmptyRelationshipEntry,
  getRelationshipTypeLabel,
  KINSIGHT_PRIMARY_RELATIONSHIP_TYPE_KEY,
  readPrimaryRelationshipTypeFromProfile,
  type RelationshipType,
} from "@/lib/contacts/relationship-tree";
import type { ContactDetail } from "@/types/contact";

export const KINSIGHT_RELATIONSHIP_KEY = "__kinsightRelationship";

export function normalizeContactRelationship(value: string | undefined): string {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (!trimmed || trimmed === "select") return "";
  return formatRelationshipLabelDisplay(trimmed);
}

export function readContactRelationship(
  profile?: ContactProfile | Record<string, string | undefined> | null
): string {
  const stored = profile?.[KINSIGHT_RELATIONSHIP_KEY]?.trim();
  if (stored) {
    return normalizeContactRelationship(stored);
  }

  const type = readPrimaryRelationshipTypeFromProfile(profile);
  if (!type) return "";

  const preset = relationshipTypeToPresetLabel(type);
  if (preset) return normalizeContactRelationship(preset);
  if (type === "other") return "other";

  return normalizeContactRelationship(getRelationshipTypeLabel(type));
}

export function relationshipToType(
  relationship: string | undefined
): RelationshipType | "" {
  const normalized = normalizeContactRelationship(relationship);
  if (!normalized) return "";

  const entry = applyRelationshipLabelToEntry(
    createEmptyRelationshipEntry(),
    normalized
  );

  return entry.relationshipType;
}

export function formatContactRelationshipForEdit(
  relationship: string | undefined
): string {
  const normalized = normalizeContactRelationship(relationship);
  return normalized || "select";
}

export function formatContactRelationshipForProfile(
  relationship: string | undefined
): string {
  const normalized = normalizeContactRelationship(relationship);
  if (!normalized) return "";

  return normalized
    .split(/(\s|-)/)
    .map((part) => {
      if (part === " " || part === "-") return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

export function applyContactRelationship(
  profile: ContactProfile,
  relationship: string
): ContactProfile {
  const normalized = normalizeContactRelationship(relationship);
  const next: ContactProfile = { ...profile };

  if (normalized) {
    next[KINSIGHT_RELATIONSHIP_KEY] = normalized;
    const type = relationshipToType(normalized);
    if (type) {
      next[KINSIGHT_PRIMARY_RELATIONSHIP_TYPE_KEY] = type;
    } else {
      delete next[KINSIGHT_PRIMARY_RELATIONSHIP_TYPE_KEY];
    }
  } else {
    delete next[KINSIGHT_RELATIONSHIP_KEY];
    delete next[KINSIGHT_PRIMARY_RELATIONSHIP_TYPE_KEY];
  }

  return next;
}

export function enrichContactWithRelationship(
  contact: ContactDetail
): ContactDetail {
  const relationship = readContactRelationship(contact.profile);
  const relationshipType = relationshipToType(relationship);

  return {
    ...contact,
    relationship: relationship || undefined,
    relationshipType: relationshipType || undefined,
    relationshipLabel: relationship
      ? formatContactRelationshipForProfile(relationship)
      : undefined,
  };
}

export function resolveContactRelationshipDisplay(
  profile?: ContactProfile | Record<string, string | undefined> | null
): {
  relationship: string;
  relationshipType: RelationshipType | "";
  relationshipLabel: string;
} {
  const relationship = readContactRelationship(profile);
  const relationshipType = relationshipToType(relationship);

  return {
    relationship,
    relationshipType,
    relationshipLabel: formatContactRelationshipForProfile(relationship),
  };
}
