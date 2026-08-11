import type { ContactProfile } from "@/types/contact-profile";
import {
  KINSIGHT_SOCIAL_MEDIA_KEY,
  parseSocialMedia,
  serializeSocialMedia,
  type SocialMediaEntry,
} from "@/lib/contacts/social-media";
import {
  applyContactRelationship,
  readContactRelationship,
} from "@/lib/contacts/contact-relationship";
import {
  formatRelationshipEntryDisplayName,
  KINSIGHT_RELATIONSHIP_TREE_KEY,
  parseRelationshipTree,
  serializeRelationshipTree,
  type RelationshipTreeEntry,
} from "@/lib/contacts/relationship-tree";
import {
  readContactFacts,
  serializeContactFacts,
  KINSIGHT_CONTACT_FACTS_KEY,
} from "@/lib/contacts/contact-facts";
import {
  applyRelationshipLabelToEntry,
  createDefaultMotherRelationshipEntry,
  createRelatedEntryFromLabel,
  formatRelationshipLabelDisplay,
  relationshipEntryToDisplayLabel,
  RELATIONSHIP_LABEL_PRESETS,
} from "@/lib/contacts/relationship-label-presets";

export const KINSIGHT_LABELED_PHONES_KEY = "__kinsightLabeledPhones";
export const KINSIGHT_LABELED_EMAILS_KEY = "__kinsightLabeledEmails";
export const KINSIGHT_LABELED_ADDRESSES_KEY = "__kinsightLabeledAddresses";
export const KINSIGHT_LABELED_DATES_KEY = "__kinsightLabeledDates";
export const KINSIGHT_LABELED_INTERESTS_KEY = "__kinsightLabeledInterests";

export interface LabeledValueEntry {
  id: string;
  label: string;
  value: string;
}

export type LabelPresetGroup =
  | "phone"
  | "email"
  | "address"
  | "url"
  | "date"
  | "related"
  | "interest";

export const LABEL_PRESETS: Record<LabelPresetGroup, string[]> = {
  phone: ["mobile", "work", "home", "main", "other"],
  email: ["work", "personal", "home", "other"],
  address: ["home", "work", "other"],
  url: ["homepage", "work", "other"],
  date: ["birthday", "anniversary", "milestone", "other"],
  related: RELATIONSHIP_LABEL_PRESETS,
  interest: ["hobby", "food/drink", "sports", "goal", "other"],
};

const PHONE_LEGACY: { key: keyof ContactProfile; label: string }[] = [
  { key: "mobilePhone", label: "mobile" },
  { key: "businessPhone", label: "work" },
  { key: "homePhone", label: "home" },
  { key: "otherPhone", label: "other" },
];

const EMAIL_LEGACY: { key: keyof ContactProfile; label: string }[] = [
  { key: "businessEmail", label: "work" },
  { key: "personalEmail", label: "personal" },
  { key: "otherEmail", label: "other" },
];

const ADDRESS_LEGACY: { key: keyof ContactProfile; label: string }[] = [
  { key: "homeAddressLine1", label: "home" },
  { key: "companyAddressLine1", label: "work" },
];

export function createLabeledEntry(
  label: string,
  value = ""
): LabeledValueEntry {
  return {
    id: crypto.randomUUID(),
    label,
    value,
  };
}

function parseLabeledEntries(raw: unknown): LabeledValueEntry[] {
  if (!raw) return [];

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  const entries: LabeledValueEntry[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const value = typeof record.value === "string" ? record.value.trim() : "";
    const label = typeof record.label === "string" ? record.label.trim() : "";
    if (!label && !value) continue;
    entries.push({
      id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
      label: label || "other",
      value,
    });
  }

  return entries;
}

function serializeLabeledEntries(entries: LabeledValueEntry[]): string {
  return JSON.stringify(
    entries
      .filter((entry) => entry.label.trim() || entry.value.trim())
      .map((entry) => ({
        id: entry.id,
        label: entry.label.trim() || "other",
        value: entry.value.trim(),
      }))
  );
}

function legacyPhoneEntries(profile: ContactProfile): LabeledValueEntry[] {
  const entries: LabeledValueEntry[] = [];
  for (const item of PHONE_LEGACY) {
    const value = profile[item.key]?.trim();
    if (!value) continue;
    entries.push(createLabeledEntry(item.label, value));
  }
  return entries;
}

function legacyEmailEntries(profile: ContactProfile): LabeledValueEntry[] {
  const entries: LabeledValueEntry[] = [];
  for (const item of EMAIL_LEGACY) {
    const value = profile[item.key]?.trim();
    if (!value) continue;
    entries.push(createLabeledEntry(item.label, value));
  }
  return entries;
}

function legacyAddressEntries(profile: ContactProfile): LabeledValueEntry[] {
  const entries: LabeledValueEntry[] = [];

  const homeParts = [
    profile.homeAddressLine1,
    profile.homeAddressLine2,
    profile.homeCity,
    profile.homeState,
    profile.homeZip,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  if (homeParts.length > 0) {
    entries.push(createLabeledEntry("home", homeParts.join(", ")));
  }

  const workParts = [
    profile.companyAddressLine1,
    profile.companyAddressLine2,
    profile.companyCity,
    profile.companyState,
    profile.companyZip,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  if (workParts.length > 0) {
    entries.push(createLabeledEntry("work", workParts.join(", ")));
  }

  for (const item of ADDRESS_LEGACY) {
    const value = profile[item.key]?.trim();
    if (!value) continue;
    if (entries.some((entry) => entry.label === item.label)) continue;
    entries.push(createLabeledEntry(item.label, value));
  }

  return entries;
}

function legacyDateEntries(profile: ContactProfile): LabeledValueEntry[] {
  const entries: LabeledValueEntry[] = [];
  if (profile.birthDate?.trim()) {
    entries.push(createLabeledEntry("birthday", profile.birthDate.trim()));
  }
  if (profile.weddingAnniversary?.trim()) {
    entries.push(
      createLabeledEntry("anniversary", profile.weddingAnniversary.trim())
    );
  }
  return entries;
}

function legacyInterestEntries(profile: ContactProfile): LabeledValueEntry[] {
  const entries: LabeledValueEntry[] = [];
  if (profile.hobbiesRecreation?.trim()) {
    entries.push(createLabeledEntry("hobby", profile.hobbiesRecreation.trim()));
  }
  if (profile.spectatorSports?.trim()) {
    entries.push(createLabeledEntry("sports", profile.spectatorSports.trim()));
  }
  return entries;
}

export function readLabeledPhones(profile: ContactProfile): LabeledValueEntry[] {
  const stored = parseLabeledEntries(profile[KINSIGHT_LABELED_PHONES_KEY]);
  return stored.length > 0 ? stored : legacyPhoneEntries(profile);
}

export function readLabeledEmails(profile: ContactProfile): LabeledValueEntry[] {
  const stored = parseLabeledEntries(profile[KINSIGHT_LABELED_EMAILS_KEY]);
  return stored.length > 0 ? stored : legacyEmailEntries(profile);
}

export function readLabeledAddresses(
  profile: ContactProfile
): LabeledValueEntry[] {
  const stored = parseLabeledEntries(profile[KINSIGHT_LABELED_ADDRESSES_KEY]);
  return stored.length > 0 ? stored : legacyAddressEntries(profile);
}

export function readLabeledDates(profile: ContactProfile): LabeledValueEntry[] {
  const stored = parseLabeledEntries(profile[KINSIGHT_LABELED_DATES_KEY]);
  return stored.length > 0 ? stored : legacyDateEntries(profile);
}

export function readLabeledInterests(
  profile: ContactProfile
): LabeledValueEntry[] {
  const stored = parseLabeledEntries(profile[KINSIGHT_LABELED_INTERESTS_KEY]);
  return stored.length > 0 ? stored : legacyInterestEntries(profile);
}

export function readUrlEntries(profile: ContactProfile): SocialMediaEntry[] {
  return parseSocialMedia(profile[KINSIGHT_SOCIAL_MEDIA_KEY]);
}

export function readRelatedEntries(
  profile: ContactProfile
): RelationshipTreeEntry[] {
  return parseRelationshipTree(profile[KINSIGHT_RELATIONSHIP_TREE_KEY]);
}

function syncLegacyPhones(
  profile: ContactProfile,
  entries: LabeledValueEntry[]
): ContactProfile {
  const next = { ...profile };
  for (const item of PHONE_LEGACY) {
    delete next[item.key];
  }

  for (const entry of entries) {
    const label = entry.label.toLowerCase();
    const value = entry.value.trim();
    if (!value) continue;
    if (label === "mobile" && !next.mobilePhone) next.mobilePhone = value;
    else if (
      (label === "work" || label === "business") &&
      !next.businessPhone
    ) {
      next.businessPhone = value;
    } else if (label === "home" && !next.homePhone) next.homePhone = value;
    else if (!next.otherPhone) next.otherPhone = value;
  }

  return next;
}

function syncLegacyEmails(
  profile: ContactProfile,
  entries: LabeledValueEntry[]
): ContactProfile {
  const next = { ...profile };
  for (const item of EMAIL_LEGACY) {
    delete next[item.key];
  }

  for (const entry of entries) {
    const label = entry.label.toLowerCase();
    const value = entry.value.trim();
    if (!value) continue;
    if (
      (label === "work" || label === "business") &&
      !next.businessEmail
    ) {
      next.businessEmail = value;
    } else if (label === "personal" && !next.personalEmail) {
      next.personalEmail = value;
    } else if (!next.otherEmail) next.otherEmail = value;
  }

  return next;
}

function syncLegacyDates(
  profile: ContactProfile,
  entries: LabeledValueEntry[]
): ContactProfile {
  const next = { ...profile };
  delete next.birthDate;
  delete next.weddingAnniversary;

  for (const entry of entries) {
    const label = entry.label.toLowerCase();
    const value = entry.value.trim();
    if (!value) continue;
    if (label === "birthday" && !next.birthDate) next.birthDate = value;
    else if (label === "anniversary" && !next.weddingAnniversary) {
      next.weddingAnniversary = value;
    }
  }

  return next;
}

function syncLegacyInterests(
  profile: ContactProfile,
  entries: LabeledValueEntry[]
): ContactProfile {
  const next = { ...profile };
  delete next.hobbiesRecreation;
  delete next.spectatorSports;

  for (const entry of entries) {
    const label = entry.label.toLowerCase();
    const value = entry.value.trim();
    if (!value) continue;
    if (
      (label === "hobby" ||
        label === "interest" ||
        label.includes("hobby")) &&
      !next.hobbiesRecreation
    ) {
      next.hobbiesRecreation = value;
    } else if (label.includes("sport") && !next.spectatorSports) {
      next.spectatorSports = value;
    }
  }

  return next;
}

export interface EditContactFieldState {
  firstName: string;
  lastName: string;
  relationship: string;
  companyName: string;
  phones: LabeledValueEntry[];
  emails: LabeledValueEntry[];
  addresses: LabeledValueEntry[];
  urls: SocialMediaEntry[];
  dates: LabeledValueEntry[];
  related: RelationshipTreeEntry[];
  interests: LabeledValueEntry[];
  facts: string[];
  notesDraft: string;
}

export function buildEditContactFieldState(
  profile: ContactProfile,
  notesPreview = ""
): EditContactFieldState {
  return {
    firstName: profile.firstName?.trim() ?? "",
    lastName: profile.lastName?.trim() ?? "",
    relationship: readContactRelationship(profile),
    companyName: profile.companyName?.trim() ?? "",
    phones: readLabeledPhones(profile),
    emails: readLabeledEmails(profile),
    addresses: readLabeledAddresses(profile),
    urls: readUrlEntries(profile),
    dates: readLabeledDates(profile),
    related: readRelatedEntries(profile),
    interests: readLabeledInterests(profile),
    facts: readContactFacts(profile),
    notesDraft: notesPreview,
  };
}

export function applyEditContactFieldState(
  profile: ContactProfile,
  state: EditContactFieldState
): ContactProfile {
  let next: ContactProfile = {
    ...profile,
    firstName: state.firstName.trim() || undefined,
    lastName: state.lastName.trim() || undefined,
    companyName: state.companyName.trim() || undefined,
    [KINSIGHT_LABELED_PHONES_KEY]: serializeLabeledEntries(state.phones),
    [KINSIGHT_LABELED_EMAILS_KEY]: serializeLabeledEntries(state.emails),
    [KINSIGHT_LABELED_ADDRESSES_KEY]: serializeLabeledEntries(state.addresses),
    [KINSIGHT_LABELED_DATES_KEY]: serializeLabeledEntries(state.dates),
    [KINSIGHT_LABELED_INTERESTS_KEY]: serializeLabeledEntries(state.interests),
    [KINSIGHT_SOCIAL_MEDIA_KEY]: serializeSocialMedia(state.urls),
    [KINSIGHT_RELATIONSHIP_TREE_KEY]: serializeRelationshipTree(state.related),
  };

  const serializedFacts = serializeContactFacts(state.facts);
  if (serializedFacts) {
    next[KINSIGHT_CONTACT_FACTS_KEY] = serializedFacts;
  } else {
    delete next[KINSIGHT_CONTACT_FACTS_KEY];
  }

  next = syncLegacyPhones(next, state.phones);
  next = syncLegacyEmails(next, state.emails);
  next = syncLegacyDates(next, state.dates);
  next = syncLegacyInterests(next, state.interests);
  next = applyContactRelationship(next, state.relationship);

  return next;
}

export function relationshipEntryToLabel(entry: RelationshipTreeEntry): string {
  return relationshipEntryToDisplayLabel(entry);
}

export function relationshipEntryDisplayValue(
  entry: RelationshipTreeEntry
): string {
  return formatRelationshipEntryDisplayName(entry, "firstName");
}

export {
  applyRelationshipLabelToEntry,
  createDefaultMotherRelationshipEntry,
  createRelatedEntryFromLabel,
};

export function formatLabelDisplay(label: string): string {
  return formatRelationshipLabelDisplay(label);
}
