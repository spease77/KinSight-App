export const KINSIGHT_RELATIONSHIP_TREE_KEY = "__kinsightRelationshipTree";
export const KINSIGHT_PRIMARY_RELATIONSHIP_TYPE_KEY =
  "__kinsightPrimaryRelationshipType";

export type RelationshipType =
  | "husband"
  | "wife"
  | "son"
  | "daughter"
  | "sibling"
  | "romantic_partner"
  | "best_friend"
  | "mom"
  | "dad"
  | "stepmom"
  | "stepdad"
  | "father_in_law"
  | "mother_in_law"
  | "ex_wife"
  | "ex_husband"
  | "grandparent"
  | "grandchild"
  | "neighbor"
  | "aunt"
  | "uncle"
  | "cousin"
  | "boss_report"
  | "business_partner"
  | "client_customer"
  | "vendor_supplier"
  | "introduction_referrer"
  | "gatekeeper_assistant"
  | "coworker"
  | "mentor"
  | "broker_agent"
  | "alumnus_classmate"
  | "associate"
  | "other";

export type RelationshipFieldSet = "inner_circle" | "professional" | "gatekeeper";

export type InfluenceLevel = "low" | "medium" | "high";

export const INFLUENCE_LEVEL_OPTIONS: { value: InfluenceLevel; label: string }[] =
  [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ];

export const GATEKEEPER_CONTACT_METHODS = ["Email", "Call", "Text"] as const;

export interface RelationshipTypeOption {
  value: RelationshipType;
  label: string;
}

export interface RelationshipTypeGroup {
  label: string;
  options: RelationshipTypeOption[];
}

export const RELATIONSHIP_TYPE_GROUPS: RelationshipTypeGroup[] = [
  {
    label: "Personal / Family",
    options: [
      { value: "husband", label: "Husband" },
      { value: "wife", label: "Wife" },
      { value: "romantic_partner", label: "Romantic Partner / Spouse" },
      { value: "son", label: "Son" },
      { value: "daughter", label: "Daughter" },
      { value: "mom", label: "Mom" },
      { value: "dad", label: "Dad" },
      { value: "stepmom", label: "Stepmom" },
      { value: "stepdad", label: "Stepdad" },
      { value: "sibling", label: "Sibling" },
      { value: "mother_in_law", label: "Mother-in-Law" },
      { value: "father_in_law", label: "Father-in-Law" },
      { value: "grandparent", label: "Grandparent" },
      { value: "grandchild", label: "Grandchild" },
      { value: "aunt", label: "Aunt" },
      { value: "uncle", label: "Uncle" },
      { value: "cousin", label: "Cousin" },
      { value: "ex_wife", label: "Ex-Wife" },
      { value: "ex_husband", label: "Ex-Husband" },
      { value: "best_friend", label: "Best Friend" },
      { value: "neighbor", label: "Neighbor" },
    ],
  },
  {
    label: "Professional",
    options: [
      { value: "boss_report", label: "Boss / Report" },
      { value: "business_partner", label: "Business Partner" },
      { value: "client_customer", label: "Client / Customer" },
      { value: "vendor_supplier", label: "Vendor / Supplier" },
      { value: "introduction_referrer", label: "Introduction / Referrer" },
      { value: "coworker", label: "Coworker" },
      { value: "mentor", label: "Mentor" },
      { value: "broker_agent", label: "Broker / Agent" },
      { value: "gatekeeper_assistant", label: "Gatekeeper / Assistant" },
      { value: "alumnus_classmate", label: "Alumnus / Classmate" },
      { value: "associate", label: "Associate" },
    ],
  },
  {
    label: "Other",
    options: [{ value: "other", label: "Other" }],
  },
];

const INNER_CIRCLE_TYPES = new Set<RelationshipType>([
  "husband",
  "wife",
  "son",
  "daughter",
  "sibling",
  "romantic_partner",
  "best_friend",
  "mom",
  "dad",
  "stepmom",
  "stepdad",
  "father_in_law",
  "mother_in_law",
  "ex_wife",
  "ex_husband",
  "grandparent",
  "grandchild",
  "aunt",
  "uncle",
  "cousin",
  "neighbor",
  "other",
]);

const SPOUSE_PARTNER_TYPES = new Set<RelationshipType>([
  "husband",
  "wife",
  "romantic_partner",
  "ex_wife",
  "ex_husband",
]);

const PROFESSIONAL_TYPES = new Set<RelationshipType>([
  "boss_report",
  "business_partner",
  "client_customer",
  "vendor_supplier",
  "introduction_referrer",
  "coworker",
  "mentor",
  "broker_agent",
  "alumnus_classmate",
  "associate",
]);

export const FAMILY_RELATIONSHIP_TYPES = new Set<RelationshipType>([
  "husband",
  "wife",
  "son",
  "daughter",
  "sibling",
  "romantic_partner",
  "mom",
  "dad",
  "stepmom",
  "stepdad",
  "mother_in_law",
  "father_in_law",
  "ex_wife",
  "ex_husband",
  "grandparent",
  "grandchild",
  "aunt",
  "uncle",
  "cousin",
]);

const ALL_TYPES = new Set<RelationshipType>(
  RELATIONSHIP_TYPE_GROUPS.flatMap((group) =>
    group.options.map((option) => option.value)
  )
);

export interface RelationshipTreeEntry {
  id: string;
  relationshipType: RelationshipType | "";
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthday?: string;
  anniversary?: string;
  notes?: string;
  company?: string;
  jobTitle?: string;
  influenceLevel?: InfluenceLevel | "";
  preferredContactMethod?: string;
  bestTimeToCall?: string;
  /** @deprecated Legacy combined name */
  name?: string;
  /** @deprecated Legacy notes field */
  personalNotes?: string;
  facts?: string[];
}

export function createEmptyRelationshipEntry(): RelationshipTreeEntry {
  return {
    id: crypto.randomUUID(),
    relationshipType: "",
    firstName: "",
    lastName: "",
    facts: [],
  };
}

export function normalizeRelationshipFacts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const facts: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    facts.push(trimmed);
  }

  return facts;
}

export function getRelationshipEntryFacts(entry: RelationshipTreeEntry): string[] {
  return normalizeRelationshipFacts(entry.facts);
}

export function withRelationshipEntryFacts(
  entry: RelationshipTreeEntry,
  facts: string[]
): RelationshipTreeEntry {
  const cleaned = normalizeRelationshipFacts(facts);
  if (cleaned.length === 0) {
    const { facts: _removed, ...rest } = entry;
    return rest;
  }

  return { ...entry, facts: cleaned };
}

export function getRelationshipFieldSet(
  type: RelationshipType | ""
): RelationshipFieldSet | null {
  if (!type) return null;
  if (type === "gatekeeper_assistant") return "gatekeeper";
  if (INNER_CIRCLE_TYPES.has(type)) return "inner_circle";
  if (PROFESSIONAL_TYPES.has(type)) return "professional";
  return null;
}

export function showsAnniversaryField(type: RelationshipType | ""): boolean {
  return type !== "" && SPOUSE_PARTNER_TYPES.has(type);
}

export function getRelationshipTypeLabel(type: RelationshipType | ""): string {
  if (!type) return "";
  for (const group of RELATIONSHIP_TYPE_GROUPS) {
    const match = group.options.find((option) => option.value === type);
    if (match) return match.label;
  }
  return type;
}

export function readPrimaryRelationshipTypeFromProfile(
  profile?: Record<string, string | undefined> | null
): RelationshipType | "" {
  const value = profile?.[KINSIGHT_PRIMARY_RELATIONSHIP_TYPE_KEY]?.trim();
  if (!value || !ALL_TYPES.has(value as RelationshipType)) {
    return "";
  }
  return value as RelationshipType;
}


export function inferContactTypeFromRelationshipType(
  type: RelationshipType
): "professional" | "personal" | "family" {
  const fieldSet = getRelationshipFieldSet(type);
  if (fieldSet === "professional" || fieldSet === "gatekeeper") {
    return "professional";
  }
  if (FAMILY_RELATIONSHIP_TYPES.has(type)) {
    return "family";
  }
  return "personal";
}

export function getEntryDisplayName(entry: RelationshipTreeEntry): string {
  const parts = [entry.firstName?.trim(), entry.lastName?.trim()].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return entry.name?.trim() ?? "";
}

export function formatRelationshipNameInputValue(
  entry: RelationshipTreeEntry
): string {
  const first = entry.firstName ?? "";
  const last = entry.lastName ?? "";
  if (!first && !last) return "";
  if (!last) return first;
  return `${first} ${last}`;
}

export function applyRelationshipNameInputLive(
  entry: RelationshipTreeEntry,
  value: string
): RelationshipTreeEntry {
  const spaceIndex = value.search(/\s/);
  if (spaceIndex === -1) {
    return { ...entry, firstName: value, lastName: "" };
  }

  return {
    ...entry,
    firstName: value.slice(0, spaceIndex),
    lastName: value.slice(spaceIndex + 1),
  };
}

export function normalizeRelationshipEntryName(
  entry: RelationshipTreeEntry,
  rawInput?: string
): RelationshipTreeEntry {
  const source = (rawInput ?? formatRelationshipNameInputValue(entry)).trim();
  if (!source) {
    return { ...entry, firstName: "", lastName: "" };
  }

  const { firstName, lastName } = splitLegacyName(source);
  return { ...entry, firstName, lastName };
}

export function formatRelationshipEntryDisplayName(
  entry: RelationshipTreeEntry,
  sortField: RelationshipTreeSortField
): string {
  const firstName = entry.firstName?.trim() ?? "";
  const lastName = entry.lastName?.trim() ?? "";

  if (firstName || lastName) {
    if (sortField === "lastName" && lastName) {
      return firstName ? `${lastName}, ${firstName}` : lastName;
    }
    return [firstName, lastName].filter(Boolean).join(" ");
  }

  const legacyName = entry.name?.trim() ?? "";
  if (!legacyName) return "";

  if (sortField === "lastName") {
    const commaIndex = legacyName.indexOf(",");
    if (commaIndex !== -1) return legacyName;

    const parts = legacyName.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return legacyName;
    const last = parts.slice(1).join(" ");
    return `${last}, ${parts[0]}`;
  }

  return legacyName;
}

export type RelationshipTreeSortField = "firstName" | "lastName" | "relationshipType";
export type RelationshipTreeSortDirection = "asc" | "desc";

function compareRelationshipStrings(a: string, b: string): number {
  const aNorm = a.trim().toLowerCase();
  const bNorm = b.trim().toLowerCase();
  if (!aNorm && !bNorm) return 0;
  if (!aNorm) return 1;
  if (!bNorm) return -1;
  return aNorm.localeCompare(bNorm, undefined, { sensitivity: "base" });
}

export function sortRelationshipTreeEntries(
  entries: RelationshipTreeEntry[],
  options: {
    field?: RelationshipTreeSortField;
    direction?: RelationshipTreeSortDirection;
  } = {}
): RelationshipTreeEntry[] {
  const field = options.field ?? "firstName";
  const direction = options.direction ?? "asc";
  const factor = direction === "asc" ? 1 : -1;

  return [...entries].sort((a, b) => {
    let cmp = 0;

    if (field === "firstName") {
      cmp = compareRelationshipStrings(a.firstName, b.firstName);
      if (cmp === 0) cmp = compareRelationshipStrings(a.lastName, b.lastName);
    } else if (field === "lastName") {
      cmp = compareRelationshipStrings(a.lastName, b.lastName);
      if (cmp === 0) cmp = compareRelationshipStrings(a.firstName, b.firstName);
    } else {
      cmp = compareRelationshipStrings(
        getRelationshipTypeLabel(a.relationshipType),
        getRelationshipTypeLabel(b.relationshipType)
      );
      if (cmp === 0) {
        cmp = compareRelationshipStrings(
          getEntryDisplayName(a),
          getEntryDisplayName(b)
        );
      }
    }

    return cmp * factor;
  });
}

const RELATIONSHIP_CLOSENESS_TIER_1 = new Set<RelationshipType>([
  "husband",
  "wife",
  "romantic_partner",
  "son",
  "daughter",
  "ex_wife",
  "ex_husband",
]);

const RELATIONSHIP_CLOSENESS_TIER_2 = new Set<RelationshipType>([
  "mom",
  "dad",
  "stepmom",
  "stepdad",
  "sibling",
]);

const RELATIONSHIP_CLOSENESS_TIER_3 = new Set<RelationshipType>([
  "grandparent",
  "grandchild",
  "aunt",
  "uncle",
  "cousin",
  "mother_in_law",
  "father_in_law",
]);

const RELATIONSHIP_CLOSENESS_SUB_RANK: Partial<Record<RelationshipType, number>> =
  {
    husband: 10,
    wife: 11,
    romantic_partner: 12,
    ex_husband: 13,
    ex_wife: 14,
    son: 20,
    daughter: 21,
    dad: 30,
    mom: 31,
    stepdad: 32,
    stepmom: 33,
    sibling: 40,
    grandparent: 50,
    grandchild: 51,
    aunt: 52,
    uncle: 53,
    cousin: 54,
    father_in_law: 55,
    mother_in_law: 56,
    best_friend: 60,
    neighbor: 61,
    coworker: 70,
    boss_report: 71,
    business_partner: 72,
    client_customer: 73,
    vendor_supplier: 74,
    introduction_referrer: 75,
    mentor: 76,
    broker_agent: 77,
    gatekeeper_assistant: 78,
    alumnus_classmate: 79,
    associate: 80,
    other: 90,
  };

export function getRelationshipClosenessSubRank(
  type: RelationshipType | ""
): number {
  if (!type) return 999;
  return RELATIONSHIP_CLOSENESS_SUB_RANK[type] ?? 500;
}

export function getRelationshipClosenessTier(
  type: RelationshipType | ""
): number {
  if (!type) return 4;
  if (RELATIONSHIP_CLOSENESS_TIER_1.has(type)) return 1;
  if (RELATIONSHIP_CLOSENESS_TIER_2.has(type)) return 2;
  if (RELATIONSHIP_CLOSENESS_TIER_3.has(type)) return 3;
  return 4;
}

export function sortRelationshipTreeByCloseness(
  entries: RelationshipTreeEntry[]
): RelationshipTreeEntry[] {
  return [...entries].sort((a, b) => {
    const tierDiff =
      getRelationshipClosenessTier(a.relationshipType) -
      getRelationshipClosenessTier(b.relationshipType);
    if (tierDiff !== 0) return tierDiff;

    const subRankDiff =
      getRelationshipClosenessSubRank(a.relationshipType) -
      getRelationshipClosenessSubRank(b.relationshipType);
    if (subRankDiff !== 0) return subRankDiff;

    return compareRelationshipStrings(
      getEntryDisplayName(a),
      getEntryDisplayName(b)
    );
  });
}

function splitLegacyName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function normalizeInfluenceLevel(value: unknown): InfluenceLevel | "" {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }
  return "";
}

export function parseRelationshipTree(raw: unknown): RelationshipTreeEntry[] {
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

  const entries: RelationshipTreeEntry[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const relationshipType = record.relationshipType;
    const type =
      typeof relationshipType === "string" &&
      ALL_TYPES.has(relationshipType as RelationshipType)
        ? (relationshipType as RelationshipType)
        : "";

    const legacyName = typeof record.name === "string" ? record.name.trim() : "";
    const firstName =
      typeof record.firstName === "string"
        ? record.firstName.trim()
        : splitLegacyName(legacyName).firstName;
    const lastName =
      typeof record.lastName === "string"
        ? record.lastName.trim()
        : splitLegacyName(legacyName).lastName;

    const entry: RelationshipTreeEntry = {
      id:
        typeof record.id === "string" && record.id.trim()
          ? record.id.trim()
          : `legacy-${entries.length}`,
      relationshipType: type,
      firstName,
      lastName,
    };

    type RelationshipTreeStringField = Extract<
      keyof RelationshipTreeEntry,
      | "email"
      | "phone"
      | "birthday"
      | "anniversary"
      | "notes"
      | "personalNotes"
      | "company"
      | "jobTitle"
      | "preferredContactMethod"
      | "bestTimeToCall"
    >;

    const stringField = (key: RelationshipTreeStringField) => {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        entry[key] = value.trim();
      }
    };

    stringField("email");
    stringField("phone");
    stringField("birthday");
    stringField("anniversary");
    stringField("notes");
    stringField("personalNotes");
    stringField("company");
    stringField("jobTitle");
    stringField("preferredContactMethod");
    stringField("bestTimeToCall");

    const influence = normalizeInfluenceLevel(record.influenceLevel);
    if (influence) entry.influenceLevel = influence;

    if (!entry.notes && entry.personalNotes) {
      entry.notes = entry.personalNotes;
    }

    entry.facts = normalizeRelationshipFacts(record.facts);

    if (getEntryDisplayName(entry) || entry.relationshipType) {
      entries.push(entry);
    }
  }

  return entries;
}

function serializeEntry(entry: RelationshipTreeEntry): Record<string, unknown> | null {
  const displayName = getEntryDisplayName(entry);
  if (!displayName && !entry.relationshipType) return null;

  const base: Record<string, unknown> = {
    id: entry.id,
    relationshipType: entry.relationshipType,
    firstName: entry.firstName.trim(),
    lastName: entry.lastName.trim(),
    name: displayName,
  };

  const addOptional = (key: keyof RelationshipTreeEntry) => {
    const value = entry[key];
    if (typeof value === "string" && value.trim()) {
      base[key] = value.trim();
    }
  };

  addOptional("email");
  addOptional("phone");

  const fieldSet = getRelationshipFieldSet(entry.relationshipType);

  if (fieldSet === "inner_circle") {
    addOptional("birthday");
    if (showsAnniversaryField(entry.relationshipType)) {
      addOptional("anniversary");
    }
    if (entry.influenceLevel) base.influenceLevel = entry.influenceLevel;
    addOptional("notes");
  } else if (fieldSet === "professional") {
    addOptional("company");
    addOptional("jobTitle");
    if (entry.influenceLevel) base.influenceLevel = entry.influenceLevel;
    addOptional("notes");
  } else if (fieldSet === "gatekeeper") {
    addOptional("preferredContactMethod");
    addOptional("bestTimeToCall");
    addOptional("notes");
  }

  if (entry.relationshipType === "other") {
    addOptional("notes");
  }

  const facts = getRelationshipEntryFacts(entry);
  if (facts.length > 0) {
    base.facts = facts;
  }

  return base;
}

export function serializeRelationshipTree(
  entries: RelationshipTreeEntry[]
): string {
  const cleaned = entries
    .map((entry) => serializeEntry(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);

  return JSON.stringify(cleaned);
}

export function countRelationshipTreeFilled(
  entries: RelationshipTreeEntry[]
): { filled: number; total: number } {
  if (entries.length === 0) return { filled: 0, total: 0 };

  let filled = 0;
  let total = 0;

  for (const entry of entries) {
    total += 3;
    if (entry.relationshipType) filled += 1;
    if (entry.firstName.trim()) filled += 1;
    if (entry.lastName.trim()) filled += 1;

    const fieldSet = getRelationshipFieldSet(entry.relationshipType);
    if (fieldSet === "inner_circle") {
      total += showsAnniversaryField(entry.relationshipType) ? 4 : 3;
      if (entry.birthday?.trim()) filled += 1;
      if (showsAnniversaryField(entry.relationshipType) && entry.anniversary?.trim()) {
        filled += 1;
      }
      if (entry.influenceLevel) filled += 1;
      if (entry.notes?.trim()) filled += 1;
    } else if (fieldSet === "professional") {
      total += 4;
      if (entry.company?.trim()) filled += 1;
      if (entry.jobTitle?.trim()) filled += 1;
      if (entry.influenceLevel) filled += 1;
      if (entry.notes?.trim()) filled += 1;
    } else if (fieldSet === "gatekeeper") {
      total += 3;
      if (entry.preferredContactMethod?.trim()) filled += 1;
      if (entry.bestTimeToCall?.trim()) filled += 1;
      if (entry.notes?.trim()) filled += 1;
    }
  }

  return { filled, total };
}

export function relationshipTreeFromProfile(
  profile: Record<string, unknown> | undefined
): RelationshipTreeEntry[] {
  if (!profile) return [];
  return parseRelationshipTree(profile[KINSIGHT_RELATIONSHIP_TREE_KEY]);
}

export function relationshipTreeExportLines(
  entries: RelationshipTreeEntry[]
): string[] {
  if (entries.length === 0) return [];

  const lines: string[] = ["RELATIONSHIP TREE", "-".repeat(32)];

  for (const entry of entries) {
    const label = getRelationshipTypeLabel(entry.relationshipType);
    const displayName = getEntryDisplayName(entry);
    lines.push("");
    lines.push(`${displayName || "Unnamed"}${label ? ` (${label})` : ""}`);

    if (entry.email?.trim()) lines.push(`  Email: ${entry.email}`);
    if (entry.phone?.trim()) lines.push(`  Phone: ${entry.phone}`);

    const fieldSet = getRelationshipFieldSet(entry.relationshipType);
    if (fieldSet === "inner_circle") {
      if (entry.birthday?.trim()) lines.push(`  Birthday: ${entry.birthday}`);
      if (entry.anniversary?.trim())
        lines.push(`  Anniversary: ${entry.anniversary}`);
      if (entry.influenceLevel)
        lines.push(`  Influence Level: ${entry.influenceLevel}`);
      if (entry.notes?.trim()) lines.push(`  Notes: ${entry.notes}`);
    } else if (fieldSet === "professional") {
      if (entry.company?.trim()) lines.push(`  Company: ${entry.company}`);
      if (entry.jobTitle?.trim()) lines.push(`  Job Title: ${entry.jobTitle}`);
      if (entry.influenceLevel)
        lines.push(`  Influence Level: ${entry.influenceLevel}`);
      if (entry.notes?.trim()) lines.push(`  Notes: ${entry.notes}`);
    } else if (fieldSet === "gatekeeper") {
      if (entry.preferredContactMethod?.trim())
        lines.push(`  Preferred Contact: ${entry.preferredContactMethod}`);
      if (entry.bestTimeToCall?.trim())
        lines.push(`  Best Time to Call: ${entry.bestTimeToCall}`);
      if (entry.notes?.trim()) lines.push(`  Notes: ${entry.notes}`);
    }
  }

  return lines;
}

export function validateRelationshipEntry(entry: RelationshipTreeEntry): string | null {
  if (!entry.relationshipType) return "Select a relationship type.";
  if (!entry.firstName.trim()) return "First name is required.";
  if (!entry.lastName.trim()) return "Last name is required.";
  return null;
}
