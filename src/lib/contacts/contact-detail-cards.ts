import type { ContactDetail } from "@/types/contact";
import {
  CONTACT_PROFILE_SECTIONS,
  getProfileSection,
  sanitizeContactProfile,
  type ContactProfile,
  type ContactProfileFieldKey,
} from "@/types/contact-profile";
import {
  formatContactRelationshipForProfile,
  KINSIGHT_RELATIONSHIP_KEY,
  readContactRelationship,
} from "@/lib/contacts/contact-relationship";
import {
  formatRelationshipEntryDisplayName,
  getRelationshipTypeLabel,
  KINSIGHT_PRIMARY_RELATIONSHIP_TYPE_KEY,
  KINSIGHT_RELATIONSHIP_TREE_KEY,
  parseRelationshipTree,
} from "@/lib/contacts/relationship-tree";
import {
  dedupeSocialMediaEntries,
  formatSocialMediaLinkDisplay,
  inferSocialMediaLabel,
  KINSIGHT_SOCIAL_MEDIA_KEY,
  normalizeSocialMediaUrl,
  parseSocialMedia,
} from "@/lib/contacts/social-media";
import { buildMailtoHref } from "@/lib/contacts/contact-emails";
import {
  buildTelHref,
  formatPhoneToE164,
} from "@/lib/contacts/contact-phone";
import { formatStoredPhoneDisplay } from "@/lib/contacts/phone-input";
import {
  getLatestUserAuthoredNote,
  resolveUserAuthoredNoteDisplay,
} from "@/lib/contacts/notes-log";

export type ContactDetailCardRow = {
  id: string;
  label: string;
  value: string;
  secondary?: string;
  href?: string;
  fieldKey?: string;
  labelStyle?: "default" | "subtle";
};

export type ContactDetailCard = {
  id: string;
  title: string;
  rows: ContactDetailCardRow[];
  kind?: "default" | "activity";
};

const CONTACT_INFO_FIELD_KEYS: ContactProfileFieldKey[] = [
  "businessPhone",
  "mobilePhone",
  "homePhone",
  "otherPhone",
  "businessEmail",
  "personalEmail",
  "otherEmail",
];

const INTERESTS_FIELD_KEYS: ContactProfileFieldKey[] = [
  "hobbiesRecreation",
  "spectatorSports",
  "lunchPreferences",
  "dinnerPreferences",
  "menuSpecialties",
  "vacationHabits",
  "sportsTickets",
  "conversationalSweetSpots",
];

const DATES_FIELD_KEYS: ContactProfileFieldKey[] = [
  "birthDate",
  "weddingAnniversary",
];

const PROFILE_OVERVIEW_DATE_KEYS: ContactProfileFieldKey[] = [
  "birthDate",
  "weddingAnniversary",
];

const GENERAL_INTEL_PRIORITY_KEYS: ContactProfileFieldKey[] = [
  "professionalServiceClubs",
  "conversationalSoftSpots",
  "targetPersona",
  "longRangeBusinessObjective",
  "keyDecisionMakers",
  "coreSelfPerception",
  "highlyConfidentialSensitive",
];

const GENERAL_INTEL_SECTION_ORDER = [
  "businessBackground",
  "education",
  "militaryService",
  "lifestyleAndHealth",
  "customerInfo",
  "clubsAndService",
] as const;

const HIDDEN_CARD_FIELD_KEYS = new Set<ContactProfileFieldKey>([
  "firstName",
  "lastName",
]);

const SUBTLE_LABEL_FIELD_KEYS = new Set<ContactProfileFieldKey>([
  "businessEmail",
  "personalEmail",
  "otherEmail",
  "birthDate",
  "weddingAnniversary",
]);

const ASSIGNED_FIELD_KEYS = new Set<ContactProfileFieldKey>([
  ...CONTACT_INFO_FIELD_KEYS,
  ...INTERESTS_FIELD_KEYS,
  ...DATES_FIELD_KEYS,
  ...GENERAL_INTEL_PRIORITY_KEYS,
  ...HIDDEN_CARD_FIELD_KEYS,
  "religion",
]);

const PHONE_FIELD_KEYS = new Set<ContactProfileFieldKey>([
  "businessPhone",
  "mobilePhone",
  "homePhone",
  "otherPhone",
]);

const EMAIL_FIELD_KEYS = new Set<ContactProfileFieldKey>([
  "businessEmail",
  "personalEmail",
  "otherEmail",
]);

const FIELD_LABEL_OVERRIDES: Partial<Record<ContactProfileFieldKey, string>> = {
  businessEmail: "Work",
  personalEmail: "Personal",
  otherEmail: "Other",
  birthDate: "Birthday",
  weddingAnniversary: "Anniversary",
};

const FIELD_LABEL_CACHE = new Map<ContactProfileFieldKey, string>();

function hrefForProfileField(
  fieldKey: ContactProfileFieldKey,
  value: string
): string | undefined {
  if (PHONE_FIELD_KEYS.has(fieldKey)) {
    const e164 = formatPhoneToE164(value);
    if (!e164) return undefined;
    return buildTelHref(e164);
  }

  if (EMAIL_FIELD_KEYS.has(fieldKey)) {
    return buildMailtoHref(value);
  }

  return undefined;
}

function labelForFieldKey(fieldKey: ContactProfileFieldKey): string {
  const cached = FIELD_LABEL_CACHE.get(fieldKey);
  if (cached) return cached;

  const override = FIELD_LABEL_OVERRIDES[fieldKey];
  if (override) {
    FIELD_LABEL_CACHE.set(fieldKey, override);
    return override;
  }

  const fieldContext = CONTACT_PROFILE_SECTIONS.flatMap((section) =>
    section.groups.flatMap((group) =>
      group.fields
        .filter((field) => field.key === fieldKey)
        .map((field) => ({ field, group }))
    )
  )[0];

  const label = fieldContext
    ? fieldContext.group.fields.length > 1
      ? fieldContext.field.label
      : fieldContext.group.title
    : fieldKey;

  FIELD_LABEL_CACHE.set(fieldKey, label);
  return label;
}

function buildRowsFromFieldKeys(
  profile: ReturnType<typeof sanitizeContactProfile>,
  keys: ContactProfileFieldKey[],
  options?: { labelStyle?: "default" | "subtle" }
): ContactDetailCardRow[] {
  const rows: ContactDetailCardRow[] = [];

  for (const key of keys) {
    const value = profile[key]?.trim();
    if (!value) continue;

    const displayValue = PHONE_FIELD_KEYS.has(key)
      ? formatStoredPhoneDisplay(value)
      : value;

    rows.push({
      id: key,
      label: labelForFieldKey(key),
      value: displayValue,
      href: hrefForProfileField(key, value),
      fieldKey: key,
      labelStyle:
        options?.labelStyle ??
        (SUBTLE_LABEL_FIELD_KEYS.has(key) ? "subtle" : "default"),
    });
  }

  return rows;
}

function withSubtleLabels(rows: ContactDetailCardRow[]): ContactDetailCardRow[] {
  return rows.map((row) => ({ ...row, labelStyle: "subtle" }));
}

function buildInterestsOverviewRow(
  profile: ReturnType<typeof sanitizeContactProfile>
): ContactDetailCardRow | null {
  const values = INTERESTS_FIELD_KEYS.map((key) => profile[key]?.trim()).filter(
    Boolean
  ) as string[];

  if (values.length === 0) return null;

  return {
    id: "interests",
    label: "Interests",
    value: values.join(", "),
    labelStyle: "subtle",
  };
}


export function getProfileNotesDisplay(
  contact: ContactDetail,
  maxLength = 500
): string | null {
  return resolveUserAuthoredNoteDisplay(contact, maxLength);
}

export function hasProfileNotes(contact: ContactDetail): boolean {
  return Boolean(getProfileNotesDisplay(contact));
}

function formatAddressLines(
  line1?: string,
  line2?: string,
  city?: string,
  state?: string,
  zip?: string
): string {
  const street = [line1, line2].map((part) => part?.trim()).filter(Boolean);
  const locality = [city, state].map((part) => part?.trim()).filter(Boolean);
  const postal = zip?.trim();

  const lines: string[] = [];
  if (street.length > 0) lines.push(street.join(", "));
  if (locality.length > 0 || postal) {
    lines.push(
      [locality.join(", "), postal].filter(Boolean).join(locality.length > 0 ? " " : "")
    );
  }

  return lines.join("\n");
}

function buildAddressRows(
  profile: ReturnType<typeof sanitizeContactProfile>
): ContactDetailCardRow[] {
  const rows: ContactDetailCardRow[] = [];

  const homeAddress = formatAddressLines(
    profile.homeAddressLine1,
    profile.homeAddressLine2,
    profile.homeCity,
    profile.homeState,
    profile.homeZip
  );
  if (homeAddress) {
    rows.push({
      id: "homeAddress",
      label: "Home",
      value: homeAddress,
      labelStyle: "subtle",
      fieldKey: "homeAddressLine1",
    });
  }

  const workAddress = formatAddressLines(
    profile.companyAddressLine1,
    profile.companyAddressLine2,
    profile.companyCity,
    profile.companyState,
    profile.companyZip
  );
  if (workAddress) {
    rows.push({
      id: "workAddress",
      label: "Work",
      value: workAddress,
      labelStyle: "subtle",
      fieldKey: "companyAddressLine1",
    });
  }

  return rows;
}

export function buildProfileContextRows(
  contact: ContactDetail
): ContactDetailCardRow[] {
  return buildProfileOverviewRows(contact);
}

export function buildProfileOverviewRows(
  contact: ContactDetail
): ContactDetailCardRow[] {
  const profile = sanitizeContactProfile(contact.profile);
  const relationship =
    contact.relationship ?? readContactRelationship(contact.profile);
  const rows: ContactDetailCardRow[] = [];

  if (relationship) {
    rows.push({
      id: "relationship",
      label: "Relationship",
      labelStyle: "subtle",
      value: formatContactRelationshipForProfile(relationship),
    });
  }

  const company = contact.company?.trim();
  if (company) {
    rows.push({
      id: "company",
      label: "Company",
      labelStyle: "subtle",
      value: company,
    });
  }

  const interestsRow = buildInterestsOverviewRow(profile);
  if (interestsRow) {
    rows.push(interestsRow);
  }

  rows.push(
    ...withSubtleLabels(
      buildRowsFromFieldKeys(profile, PROFILE_OVERVIEW_DATE_KEYS)
    )
  );

  const religion = profile.religion?.trim();
  if (religion) {
    rows.push({
      id: "religion",
      label: "Religion",
      value: religion,
      fieldKey: "religion",
      labelStyle: "subtle",
    });
  }

  return rows;
}

export function buildContactInfoRows(
  contact: ContactDetail
): ContactDetailCardRow[] {
  const profile = sanitizeContactProfile(contact.profile);

  return dedupeContactDetailRows([
    ...buildRowsFromFieldKeys(profile, CONTACT_INFO_FIELD_KEYS),
    ...buildSocialMediaRows(profile),
    ...buildAddressRows(profile),
  ]);
}

export function buildPersonalDetailsRows(
  contact: ContactDetail
): ContactDetailCardRow[] {
  return [];
}

export function buildGeneralIntelCardRows(
  contact: ContactDetail
): ContactDetailCardRow[] {
  const profile = sanitizeContactProfile(contact.profile);
  return buildGeneralIntelRows(profile, contact);
}

function buildRelationshipRows(
  profile: ReturnType<typeof sanitizeContactProfile>
): ContactDetailCardRow[] {
  const entries = parseRelationshipTree(profile[KINSIGHT_RELATIONSHIP_TREE_KEY]);

  return entries.map((entry) => {
    const displayName = formatRelationshipEntryDisplayName(entry, "firstName");
    const typeLabel = getRelationshipTypeLabel(entry.relationshipType);
    const secondary = [entry.phone, entry.email, entry.company]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" · ");

    return {
      id: entry.id,
      label: typeLabel || "Connection",
      value: displayName || "Unnamed contact",
      secondary: secondary || undefined,
    };
  });
}

function dedupeContactDetailRows(
  rows: ContactDetailCardRow[]
): ContactDetailCardRow[] {
  if (rows.length <= 1) return rows;

  const seen = new Set<string>();
  const deduped: ContactDetailCardRow[] = [];

  for (const row of rows) {
    const keys = [row.href?.trim().toLowerCase(), row.id].filter(
      (key): key is string => Boolean(key)
    );

    if (keys.length === 0) {
      deduped.push(row);
      continue;
    }

    if (keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

const CONTACT_INTEL_PROFILE_KEYS: Array<keyof ContactProfile | string> = [
  ...PROFILE_OVERVIEW_DATE_KEYS,
  "religion",
  ...INTERESTS_FIELD_KEYS,
  ...CONTACT_INFO_FIELD_KEYS,
  KINSIGHT_SOCIAL_MEDIA_KEY,
  KINSIGHT_RELATIONSHIP_TREE_KEY,
  "homeAddressLine1",
  "homeAddressLine2",
  "homeCity",
  "homeState",
  "homeZip",
  "companyAddressLine1",
  "companyAddressLine2",
  "companyCity",
  "companyState",
  "companyZip",
  KINSIGHT_RELATIONSHIP_KEY,
  KINSIGHT_PRIMARY_RELATIONSHIP_TYPE_KEY,
];

export function getContactIntelMemoKey(contact: ContactDetail): string {
  const profile = contact.profile;
  const profileSignature = CONTACT_INTEL_PROFILE_KEYS.map(
    (key) => profile?.[key as keyof ContactProfile] ?? ""
  );

  const notesLog = contact.notesLog ?? [];
  const latestUserNote = getLatestUserAuthoredNote(notesLog);
  const notesSignature = latestUserNote
    ? `${latestUserNote.id}:${latestUserNote.content}`
    : resolveUserAuthoredNoteDisplay(contact, 200) ?? "";

  return JSON.stringify({
    id: contact.id,
    company: contact.company ?? "",
    relationship: contact.relationship ?? "",
    notesSignature,
    profileSignature,
  });
}

function buildSocialMediaRows(
  profile: ReturnType<typeof sanitizeContactProfile>
): ContactDetailCardRow[] {
  const entries = dedupeSocialMediaEntries(
    parseSocialMedia(profile[KINSIGHT_SOCIAL_MEDIA_KEY])
  );

  return entries.map((entry) => ({
    id: entry.id,
    label: inferSocialMediaLabel(entry),
    labelStyle: "subtle",
    value: formatSocialMediaLinkDisplay(entry),
    href: normalizeSocialMediaUrl(entry.url),
  }));
}

function buildSectionRows(
  sectionId: string,
  profile: ReturnType<typeof sanitizeContactProfile>,
  excludeKeys: Set<ContactProfileFieldKey>
): ContactDetailCardRow[] {
  if (sectionId === "relationshipTree") {
    return buildRelationshipRows(profile);
  }

  if (sectionId === "socialMedia") {
    return buildSocialMediaRows(profile);
  }

  const section = getProfileSection(sectionId);
  if (!section) return [];

  const rows: ContactDetailCardRow[] = [];

  for (const group of section.groups) {
    for (const field of group.fields) {
      if (
        excludeKeys.has(field.key) ||
        HIDDEN_CARD_FIELD_KEYS.has(field.key)
      ) {
        continue;
      }

      const value = profile[field.key]?.trim();
      if (!value) continue;

      rows.push({
        id: field.key,
        label: labelForFieldKey(field.key),
        value,
        href: hrefForProfileField(field.key, value),
        fieldKey: field.key,
        labelStyle: SUBTLE_LABEL_FIELD_KEYS.has(field.key) ? "subtle" : "default",
      });
    }
  }

  return rows;
}

function buildGeneralIntelRows(
  profile: ReturnType<typeof sanitizeContactProfile>,
  contact: ContactDetail
): ContactDetailCardRow[] {
  const rows: ContactDetailCardRow[] = [
    ...buildRowsFromFieldKeys(profile, GENERAL_INTEL_PRIORITY_KEYS),
  ];

  if (contact.nextSteps?.trim()) {
    rows.push({
      id: "nextSteps",
      label: "Next Steps",
      value: contact.nextSteps.trim(),
      fieldKey: "nextSteps",
    });
  }

  if (contact.topics && contact.topics.length > 0) {
    rows.push({
      id: "topics",
      label: "Topics",
      value: contact.topics.join(", "),
      fieldKey: "topics",
    });
  }

  for (const sectionId of GENERAL_INTEL_SECTION_ORDER) {
    rows.push(...buildSectionRows(sectionId, profile, ASSIGNED_FIELD_KEYS));
  }

  return dedupeContactDetailRows(rows);
}

function pushCardIfPopulated(
  cards: ContactDetailCard[],
  id: string,
  title: string,
  rows: ContactDetailCardRow[]
) {
  if (rows.length === 0) return;
  cards.push({ id, title, rows });
}

export function buildContactDetailCards(contact: ContactDetail): ContactDetailCard[] {
  const profile = sanitizeContactProfile(contact.profile);
  const cards: ContactDetailCard[] = [];

  pushCardIfPopulated(
    cards,
    "profileOverview",
    "Identity & Personal Details",
    buildProfileOverviewRows(contact)
  );

  pushCardIfPopulated(
    cards,
    "relationshipTree",
    "Persons / Network",
    buildRelationshipRows(profile)
  );

  pushCardIfPopulated(
    cards,
    "contactInfo",
    "Contact Info",
    buildContactInfoRows(contact)
  );

  return cards;
}
