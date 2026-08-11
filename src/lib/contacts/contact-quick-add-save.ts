import type { ContactDetail } from "@/types/contact";
import type { ContactProfile } from "@/types/contact-profile";
import {
  sanitizeContactProfile,
  mergeProfileSectionForSave,
} from "@/types/contact-profile";
import { persistContactProfile } from "@/lib/contacts/contact-quick-add-persist";
import {
  type DateSubtype,
  type InterestSubtype,
  type PersonSubtype,
  splitQuickAddName,
} from "@/lib/contacts/contact-quick-add-anchors";
import {
  createEmptyRelationshipEntry,
  KINSIGHT_RELATIONSHIP_TREE_KEY,
  parseRelationshipTree,
  serializeRelationshipTree,
  type RelationshipTreeEntry,
  type RelationshipType,
} from "@/lib/contacts/relationship-tree";
import { readApiJson } from "@/lib/api/read-json";

export async function saveQuickAddRelationshipEntry(
  contact: ContactDetail,
  entry: RelationshipTreeEntry
): Promise<{ contact?: ContactDetail; error?: string }> {
  const trimmedName = `${entry.firstName ?? ""} ${entry.lastName ?? ""}`.trim();
  if (!trimmedName) {
    return { error: "Enter a name." };
  }

  const profile = contact.profile ?? {};
  const existing = parseRelationshipTree(profile[KINSIGHT_RELATIONSHIP_TREE_KEY]);
  const nextProfile: ContactProfile = {
    ...profile,
    [KINSIGHT_RELATIONSHIP_TREE_KEY]: serializeRelationshipTree([
      entry,
      ...existing,
    ]),
  };

  return persistContactProfile(contact.id, nextProfile);
}

export async function saveQuickAddPerson(
  contact: ContactDetail,
  subtype: PersonSubtype,
  name: string,
  customLabel?: string
): Promise<{ contact?: ContactDetail; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Enter a name." };
  }

  const { firstName, lastName } = splitQuickAddName(trimmed);
  const relationshipType: RelationshipType =
    customLabel ? "other" : subtype.relationshipType;

  const entry = {
    ...createEmptyRelationshipEntry(),
    relationshipType,
    firstName,
    lastName,
    ...(customLabel
      ? { notes: customLabel.trim() }
      : {}),
  };

  const profile = contact.profile ?? {};
  const existing = parseRelationshipTree(profile[KINSIGHT_RELATIONSHIP_TREE_KEY]);
  const nextProfile: ContactProfile = {
    ...profile,
    [KINSIGHT_RELATIONSHIP_TREE_KEY]: serializeRelationshipTree([
      ...existing,
      entry,
    ]),
  };

  return persistContactProfile(contact.id, nextProfile);
}

function appendProfileValue(
  existing: string | undefined,
  label: string,
  value: string,
  prefixValue?: boolean
): string {
  const line = prefixValue ? `${label}: ${value}` : value;
  const prior = existing?.trim();
  if (!prior) return line;
  if (prior.includes(line)) return prior;
  return `${prior}\n${line}`;
}

export async function saveQuickAddInterest(
  contact: ContactDetail,
  subtype: InterestSubtype,
  value: string,
  customLabel?: string,
  options?: { prefixValue?: boolean }
): Promise<{ contact?: ContactDetail; error?: string }> {
  const trimmed = value.trim();
  if (!trimmed) {
    return { error: "Enter a value before saving." };
  }

  const label = customLabel?.trim() || subtype.label;
  const savedProfile = contact.profile ?? {};
  const fieldKey = subtype.fieldKey;
  const prefixValue =
    options?.prefixValue ??
    (customLabel ? true : subtype.prefixValue ?? false);
  const mergedValue = appendProfileValue(
    savedProfile[fieldKey],
    label,
    trimmed,
    prefixValue
  );

  const draft: ContactProfile = {
    ...savedProfile,
    [fieldKey]: mergedValue,
  };

  const merged = mergeProfileSectionForSave(
    savedProfile,
    draft,
    subtype.sectionId
  );

  return persistContactProfile(contact.id, merged);
}

export async function saveQuickAddDate(
  contact: ContactDetail,
  subtype: DateSubtype,
  value: string,
  customLabel?: string
): Promise<{ contact?: ContactDetail; error?: string }> {
  const trimmed = value.trim();
  if (!trimmed) {
    return { error: "Enter a date or timing before saving." };
  }

  if (subtype.kind === "profile_field" && subtype.fieldKey) {
    const savedProfile = contact.profile ?? {};
    const nextProfile = sanitizeContactProfile({
      ...savedProfile,
      [subtype.fieldKey]: trimmed,
    });
    return persistContactProfile(contact.id, nextProfile);
  }

  const label = customLabel?.trim() || subtype.notePrefix || subtype.label;
  const content = `${label}: ${trimmed}`;

  const res = await fetch(`/api/contacts/${contact.id}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  const data = await readApiJson<{ contact?: ContactDetail; error?: string }>(
    res
  );

  if (!res.ok || !data.contact) {
    return { error: data.error ?? "Could not save date." };
  }

  return { contact: data.contact };
}
