import type { ParsedProposedPerson } from "@/lib/ai/parse-multi-contact";
import { findExistingContactByName } from "@/lib/contacts/match-existing";
import {
  applyRelationshipLabelToEntry,
  isRelationshipPresetLabel,
} from "@/lib/contacts/relationship-label-presets";
import {
  createEmptyRelationshipEntry,
  getRelationshipEntryFacts,
  getEntryDisplayName,
  normalizeRelationshipFacts,
  type RelationshipTreeEntry,
  type RelationshipType,
} from "@/lib/contacts/relationship-tree";
import type { Contact } from "@/types/contact";
import { splitFullName } from "@/types/contact-profile";

const HINT_ANCHOR_PATTERNS = [
  /\b(?:wife|husband|spouse|partner|son|daughter|child|mother|father|mom|dad|brother|sister|sibling|assistant|colleague|coworker|manager|friend|aunt|uncle|cousin|grandmother|grandfather|grandparent|grandchild|niece|nephew|in-law)\s+of\s+(.+)$/i,
  /\b(?:to|for)\s+(.+)$/i,
];

export function inferAnchorNameFromRelationshipHint(
  hint: string | undefined
): string | null {
  if (!hint?.trim()) return null;
  const trimmed = hint.trim();
  for (const pattern of HINT_ANCHOR_PATTERNS) {
    const match = trimmed.match(pattern);
    const candidate = match?.[1]?.trim().replace(/[.,;]+$/, "");
    if (candidate && candidate.length >= 2) {
      return candidate;
    }
  }
  return null;
}

export function resolveConnectionAnchorContact(
  person: ParsedProposedPerson,
  contacts: Contact[]
): Contact | undefined {
  const anchorName =
    person.connectionAnchorName?.trim() ||
    inferAnchorNameFromRelationshipHint(person.relationshipHint) ||
    undefined;

  if (!anchorName) return undefined;
  return findExistingContactByName(anchorName, contacts);
}

export function shouldTreatPersonAsConnection(
  person: ParsedProposedPerson,
  anchor: Contact | undefined
): boolean {
  if (person.recordAs === "contact") {
    return false;
  }

  if (!anchor) {
    return false;
  }

  const personKey = person.displayName.trim().toLowerCase();
  const anchorKey = anchor.name.trim().toLowerCase();
  if (personKey && personKey === anchorKey) {
    return false;
  }

  if (person.recordAs === "connection") {
    return true;
  }

  return Boolean(
    person.connectionAnchorName?.trim() ||
      inferAnchorNameFromRelationshipHint(person.relationshipHint)
  );
}

function inferRelationshipLabel(person: ParsedProposedPerson): string {
  const hint = person.relationshipHint?.trim().toLowerCase() ?? "";
  const candidates = [
    "mother-in-law",
    "father-in-law",
    "stepmother",
    "stepfather",
    "grandmother",
    "grandfather",
    "grandparent",
    "grandchild",
    "grandson",
    "granddaughter",
    "husband",
    "wife",
    "spouse",
    "partner",
    "son",
    "daughter",
    "mother",
    "father",
    "brother",
    "sister",
    "sibling",
    "aunt",
    "uncle",
    "cousin",
    "assistant",
    "colleague",
    "manager",
    "friend",
    "other",
  ];

  for (const label of candidates) {
    if (hint.includes(label)) return label;
  }

  if (hint.includes("in law")) return "mother-in-law";
  if (hint.includes("step")) return "stepmother";

  return "other";
}

export function personToRelationshipEntry(
  person: ParsedProposedPerson
): RelationshipTreeEntry {
  const profile = person.profile ?? {};
  const fromProfile = splitFullName(
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      person.displayName
  );
  const fromDisplay = splitFullName(person.displayName);

  const firstName =
    person.firstName?.trim() ||
    profile.firstName?.trim() ||
    fromProfile.firstName ||
    fromDisplay.firstName ||
    person.displayName.trim();
  const lastName =
    person.lastName?.trim() ||
    profile.lastName?.trim() ||
    fromProfile.lastName ||
    fromDisplay.lastName ||
    "";

  const facts: string[] = [];
  if (person.notes?.trim()) facts.push(person.notes.trim());
  if (person.role?.trim()) facts.push(`Role: ${person.role.trim()}`);
  if (person.company?.trim()) facts.push(`Company: ${person.company.trim()}`);

  let entry = createEmptyRelationshipEntry();
  entry = {
    ...entry,
    firstName,
    lastName,
    company: person.company?.trim() || profile.companyName?.trim(),
    jobTitle: person.role?.trim(),
    facts: normalizeRelationshipFacts(facts),
  };

  const label = inferRelationshipLabel(person);
  entry = applyRelationshipLabelToEntry(entry, label);

  if (
    entry.relationshipType === "other" &&
    person.relationshipHint?.trim() &&
    !isRelationshipPresetLabel(label)
  ) {
    entry.notes = person.relationshipHint.trim();
  }

  return entry;
}

export function mergeConnectionFacts(
  entry: RelationshipTreeEntry,
  person: ParsedProposedPerson
): RelationshipTreeEntry {
  const incoming = personToRelationshipEntry(person);
  const mergedFacts = normalizeRelationshipFacts([
    ...getRelationshipEntryFacts(entry),
    ...getRelationshipEntryFacts(incoming),
  ]);

  return {
    ...entry,
    ...incoming,
    id: entry.id,
    facts: mergedFacts.length > 0 ? mergedFacts : incoming.facts,
  };
}

export function findDuplicateConnectionIndex(
  entries: RelationshipTreeEntry[],
  candidate: RelationshipTreeEntry
): number {
  const candidateName = getEntryDisplayName(candidate).toLowerCase();
  if (!candidateName) return -1;

  return entries.findIndex((entry) => {
    const name = getEntryDisplayName(entry).toLowerCase();
    if (!name || name !== candidateName) return false;
    if (!candidate.relationshipType || !entry.relationshipType) return true;
    return entry.relationshipType === candidate.relationshipType;
  });
}

export function relationshipTypeLabel(type: RelationshipType | ""): string {
  if (!type) return "Connection";
  return type.replace(/_/g, " ");
}
