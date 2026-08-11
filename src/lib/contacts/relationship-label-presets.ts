import {
  createEmptyRelationshipEntry,
  type RelationshipTreeEntry,
  type RelationshipType,
} from "@/lib/contacts/relationship-tree";

export type RelationshipLabelPresetSection = {
  title: string;
  labels: string[];
};

export const RELATIONSHIP_LABEL_PRESET_SECTIONS: RelationshipLabelPresetSection[] =
  [
    {
      title: "",
      labels: [
        "mother",
        "father",
        "parent",
        "brother",
        "sister",
        "sibling",
        "child",
        "son",
        "daughter",
        "spouse",
        "partner",
        "wife",
        "husband",
      ],
    },
    {
      title: "Extended Family",
      labels: [
        "grandma",
        "grandfather",
        "grandparent",
        "grandson",
        "granddaughter",
        "grandchild",
        "aunt",
        "uncle",
        "niece",
        "nephew",
        "cousin",
      ],
    },
    {
      title: "In-Laws & Step",
      labels: [
        "mother-in-law",
        "father-in-law",
        "sister-in-law",
        "brother-in-law",
        "daughter-in-law",
        "son-in-law",
        "stepmother",
        "stepfather",
        "stepbrother",
        "stepsister",
        "stepchild",
        "stepson",
        "stepdaughter",
      ],
    },
    {
      title: "Professional & Other",
      labels: [
        "friend",
        "fiancé",
        "boyfriend",
        "girlfriend",
        "colleague",
        "manager",
        "assistant",
        "doctor",
        "teacher",
        "other",
      ],
    },
  ];

export const RELATIONSHIP_LABEL_PRESETS: string[] =
  RELATIONSHIP_LABEL_PRESET_SECTIONS.flatMap((section) => section.labels);

const RELATIONSHIP_LABEL_TO_TYPE: Record<string, RelationshipType> = {
  mother: "mom",
  father: "dad",
  parent: "mom",
  brother: "sibling",
  sister: "sibling",
  sibling: "sibling",
  child: "son",
  son: "son",
  daughter: "daughter",
  spouse: "romantic_partner",
  partner: "romantic_partner",
  wife: "wife",
  husband: "husband",
  grandma: "grandparent",
  grandfather: "grandparent",
  grandparent: "grandparent",
  grandson: "grandchild",
  granddaughter: "grandchild",
  grandchild: "grandchild",
  aunt: "aunt",
  uncle: "uncle",
  niece: "cousin",
  nephew: "cousin",
  cousin: "cousin",
  "mother-in-law": "mother_in_law",
  "father-in-law": "father_in_law",
  "sister-in-law": "sibling",
  "brother-in-law": "sibling",
  "daughter-in-law": "daughter",
  "son-in-law": "son",
  stepmother: "stepmom",
  stepfather: "stepdad",
  stepbrother: "sibling",
  stepsister: "sibling",
  stepchild: "son",
  stepson: "son",
  stepdaughter: "daughter",
  friend: "best_friend",
  fiancé: "romantic_partner",
  fiance: "romantic_partner",
  boyfriend: "romantic_partner",
  girlfriend: "romantic_partner",
  colleague: "coworker",
  manager: "boss_report",
  assistant: "gatekeeper_assistant",
  doctor: "other",
  teacher: "other",
  other: "other",
};

const TYPE_TO_DEFAULT_LABEL: Partial<Record<RelationshipType, string>> = {
  mom: "mother",
  dad: "father",
  sibling: "sibling",
  son: "son",
  daughter: "daughter",
  romantic_partner: "partner",
  wife: "wife",
  husband: "husband",
  grandparent: "grandparent",
  grandchild: "grandchild",
  aunt: "aunt",
  uncle: "uncle",
  cousin: "cousin",
  mother_in_law: "mother-in-law",
  father_in_law: "father-in-law",
  stepmom: "stepmother",
  stepdad: "stepfather",
  best_friend: "friend",
  coworker: "colleague",
  boss_report: "manager",
  gatekeeper_assistant: "assistant",
  other: "other",
};

function normalizeRelationshipLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function isRelationshipPresetLabel(label: string): boolean {
  return RELATIONSHIP_LABEL_PRESETS.includes(normalizeRelationshipLabel(label));
}

export function isCustomRelationshipLabel(label: string): boolean {
  const normalized = normalizeRelationshipLabel(label);
  return Boolean(normalized && normalized !== "select" && !isRelationshipPresetLabel(normalized));
}

export function formatRelationshipLabelDisplay(label: string): string {
  const trimmed = label.trim();
  return trimmed ? trimmed.toLowerCase() : "other";
}

export function relationshipTypeToPresetLabel(
  type: RelationshipType | ""
): string | null {
  if (!type) return null;
  return TYPE_TO_DEFAULT_LABEL[type] ?? null;
}

export function createRelatedEntryFromLabel(label: string): RelationshipTreeEntry {
  const normalized = normalizeRelationshipLabel(label);
  const entry = createEmptyRelationshipEntry();
  return applyRelationshipLabelToEntry(entry, normalized || "mother");
}

export function createDefaultMotherRelationshipEntry(): RelationshipTreeEntry {
  return createRelatedEntryFromLabel("mother");
}

export function applyRelationshipLabelToEntry(
  entry: RelationshipTreeEntry,
  label: string
): RelationshipTreeEntry {
  const normalized = normalizeRelationshipLabel(label);

  if (!normalized || !isRelationshipPresetLabel(normalized)) {
    return {
      ...entry,
      relationshipType: "other",
      notes: normalized || label.trim(),
    };
  }

  const relationshipType =
    RELATIONSHIP_LABEL_TO_TYPE[normalized] ?? ("other" as RelationshipType);

  if (relationshipType === "other") {
    return {
      ...entry,
      relationshipType: "other",
      notes: normalized,
    };
  }

  const { notes: _removed, ...rest } = entry;
  return {
    ...rest,
    relationshipType,
  };
}

export function relationshipEntryToDisplayLabel(
  entry: RelationshipTreeEntry
): string {
  const notes = entry.notes?.trim();
  if (notes && !isRelationshipPresetLabel(notes)) {
    return formatRelationshipLabelDisplay(notes);
  }

  const fromType = relationshipTypeToPresetLabel(entry.relationshipType);
  if (fromType) return fromType;

  return "other";
}
