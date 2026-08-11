import { normalizeProfileDateFields, CONTACT_DATE_HINT } from "@/lib/dates/contact-dates";

export type ContactProfileFieldKey =
  | "firstName"
  | "lastName"
  | "middleName"
  | "nickname"
  | "companyName"
  | "companyAddressLine1"
  | "companyAddressLine2"
  | "companyCity"
  | "companyState"
  | "companyZip"
  | "companyCountry"
  | "homeAddressLine1"
  | "homeAddressLine2"
  | "homeCity"
  | "homeState"
  | "homeZip"
  | "homeCountry"
  | "businessPhone"
  | "mobilePhone"
  | "homePhone"
  | "otherPhone"
  | "businessEmail"
  | "personalEmail"
  | "otherEmail"
  | "birthDate"
  | "birthPlace"
  | "hometown"
  | "height"
  | "weight"
  | "physicalCharacteristicsNotes"
  | "highSchool"
  | "highSchoolGradYear"
  | "college"
  | "collegeGradYear"
  | "collegeDegree"
  | "academicHonors"
  | "advancedDegrees"
  | "fraternitySorority"
  | "extracurricularActivities"
  | "nonCollegeSensitivity"
  | "militaryBranch"
  | "militaryRankAtDischarge"
  | "militaryServiceYears"
  | "militaryAttitude"
  | "maritalStatus"
  | "spouseFirstName"
  | "spouseLastName"
  | "spouseNickname"
  | "spouseEducation"
  | "spouseInterests"
  | "weddingAnniversary"
  | "child1Name"
  | "child1Age"
  | "child2Name"
  | "child2Age"
  | "child3Name"
  | "child3Age"
  | "custodyArrangements"
  | "childrenEducation"
  | "childrenInterests"
  | "previousEmployment"
  | "previousPositionsCurrentCompany"
  | "officeStatusSymbols"
  | "professionalAssociations"
  | "mentors"
  | "businessOperations"
  | "keyDecisionMakers"
  | "decisionMakerRelationships"
  | "internalCompanyConnections"
  | "natureOfInternalConnections"
  | "longRangeBusinessObjective"
  | "professionalServiceClubs"
  | "politicalActivity"
  | "communityActivism"
  | "religion"
  | "highlyConfidentialSensitive"
  | "nonBusinessStrongOpinions"
  | "medicalHistory"
  | "drinkingHabits"
  | "nonDrinkerSensitivity"
  | "smokingHabits"
  | "lunchPreferences"
  | "dinnerPreferences"
  | "menuSpecialties"
  | "hostingComfort"
  | "hobbiesRecreation"
  | "vacationHabits"
  | "spectatorSports"
  | "sportsTickets"
  | "carMake"
  | "carModel"
  | "carYear"
  | "carCondition"
  | "conversationalSweetSpots"
  | "conversationalSoftSpots"
  | "targetPersona"
  | "coreSelfPerception"
  | "moralEthicalStandards"
  | "feltObligations"
  | "habitAlteration"
  | "externalValidation"
  | "egoLevel"
  | "ethicalRating"
  | "corePersonalProblems"
  | "managementPriorities"
  | "problemSolvingCapacity"
  | "buyingMotivation"
  | "decisionPatterns";

export type ContactProfile = Partial<Record<ContactProfileFieldKey, string>> &
  KinSightProfileMeta;

/** Internal profile keys used when contact_type DB columns are unavailable */
export type KinSightProfileMeta = {
  __kinsightContactType?: string;
  __kinsightContactTypeNeedsConfirmation?: string;
  __kinsightRelationshipTree?: string;
  __kinsightSocialMedia?: string;
  __kinsightRelationship?: string;
  __kinsightPrimaryRelationshipType?: string;
  __kinsightLabeledPhones?: string;
  __kinsightLabeledEmails?: string;
  __kinsightLabeledAddresses?: string;
  __kinsightLabeledDates?: string;
  __kinsightLabeledInterests?: string;
  __kinsightContactFacts?: string;
};

const KINSIGHT_PROFILE_META_KEYS: (keyof KinSightProfileMeta)[] = [
  "__kinsightContactType",
  "__kinsightContactTypeNeedsConfirmation",
  "__kinsightRelationshipTree",
  "__kinsightSocialMedia",
  "__kinsightRelationship",
  "__kinsightPrimaryRelationshipType",
  "__kinsightLabeledPhones",
  "__kinsightLabeledEmails",
  "__kinsightLabeledAddresses",
  "__kinsightLabeledDates",
  "__kinsightLabeledInterests",
  "__kinsightContactFacts",
];

export interface ContactProfileFieldDef {
  key: ContactProfileFieldKey;
  label: string;
  hint: string;
  singleLine?: boolean;
}

export interface ContactProfileFieldGroup {
  id: string;
  title: string;
  hint?: string;
  /** When true, each field renders on its own full-width row. */
  stacked?: boolean;
  fields: ContactProfileFieldDef[];
}

export interface ContactProfileSection {
  id: string;
  title: string;
  groups: ContactProfileFieldGroup[];
}

const f = (
  key: ContactProfileFieldKey,
  label: string,
  hint: string,
  singleLine = false
): ContactProfileFieldDef => ({ key, label, hint, singleLine });

const narrative = (
  key: ContactProfileFieldKey,
  hint: string
): ContactProfileFieldDef[] => [
  { key, label: "Details", hint, singleLine: false },
];

export const CONTACT_PROFILE_SECTIONS: ContactProfileSection[] = [
  {
    id: "customerInfo",
    title: "Contact Info",
    groups: [
      {
        id: "contactName",
        title: "Contact Name",
        hint: "Legal name and what they prefer to be called.",
        fields: [
          f("firstName", "First Name", "Given name.", true),
          f("lastName", "Last Name", "Family / surname.", true),
          f("middleName", "Middle Name", "Middle name or initial.", true),
          f("nickname", "Prefers To Be Called", "Preferred name.", true),
        ],
      },
      {
        id: "phoneNumbers",
        title: "Phone Numbers",
        fields: [
          f("businessPhone", "Business", "Direct office or work line.", true),
          f("mobilePhone", "Mobile", "Cell phone.", true),
          f("homePhone", "Home", "Personal landline.", true),
          f("otherPhone", "Other", "Assistant, alternate, or fax.", true),
        ],
      },
      {
        id: "emailAddresses",
        title: "Email",
        stacked: true,
        fields: [
          f("businessEmail", "Business", "Work email address.", true),
          f("personalEmail", "Personal", "Personal email address.", true),
          f("otherEmail", "Other", "Assistant or alternate email.", true),
        ],
      },
      {
        id: "companyName",
        title: "Company Name",
        fields: [
          f("companyName", "Company Name", "Employer or organization.", true),
        ],
      },
      {
        id: "companyAddress",
        title: "Company Address",
        hint: "Corporate office location.",
        fields: [
          f("companyAddressLine1", "Address Line 1", "Street address or suite.", true),
          f("companyAddressLine2", "Address Line 2", "Building, floor, suite (optional).", true),
          f("companyCity", "City", "City.", true),
          f("companyState", "State / Province", "State, province, or region.", true),
          f("companyZip", "ZIP / Postal Code", "ZIP or postal code.", true),
          f("companyCountry", "Country", "Country.", true),
        ],
      },
      {
        id: "homeAddress",
        title: "Home Address",
        hint: "Personal residential location.",
        fields: [
          f("homeAddressLine1", "Address Line 1", "Street address.", true),
          f("homeAddressLine2", "Address Line 2", "Apartment, unit, etc. (optional).", true),
          f("homeCity", "City", "City.", true),
          f("homeState", "State / Province", "State, province, or region.", true),
          f("homeZip", "ZIP / Postal Code", "ZIP or postal code.", true),
          f("homeCountry", "Country", "Country.", true),
        ],
      },
      {
        id: "birthAndBackground",
        title: "Birth & Background",
        fields: [
          f("birthDate", "Birth Date", CONTACT_DATE_HINT, true),
          f("birthPlace", "Birth Place", "City and country of birth.", true),
          f("hometown", "Hometown", "Where they grew up.", true),
        ],
      },
      {
        id: "physicalCharacteristics",
        title: "Physical Characteristics",
        fields: [
          f("height", "Height", "e.g. 6'1\".", true),
          f("weight", "Weight", "Approximate weight, if noted.", true),
          f(
            "physicalCharacteristicsNotes",
            "Other Notes",
            "Posture, health indicators, or other traits."
          ),
        ],
      },
    ],
  },
  {
    id: "relationshipTree",
    title: "Relationship Tree",
    groups: [],
  },
  {
    id: "socialMedia",
    title: "Social Media / Websites",
    groups: [],
  },
  {
    id: "businessBackground",
    title: "Business Background",
    groups: [
      {
        id: "previousEmployment",
        title: "Previous Employment",
        hint: "Past companies, locations, dates, and titles.",
        fields: narrative("previousEmployment", "Comprehensive work history."),
      },
      {
        id: "previousPositionsCurrentCompany",
        title: "Previous Positions at Current Company",
        hint: "Internal promotions and dates.",
        fields: narrative(
          "previousPositionsCurrentCompany",
          "Promotions and advancement dates."
        ),
      },
      {
        id: "officeStatusSymbols",
        title: "Office Status Symbols",
        hint: "Awards, trophies, plaques, or decor.",
        fields: narrative("officeStatusSymbols", "Items on display."),
      },
      {
        id: "professionalAssociations",
        title: "Professional Associations",
        hint: "Trade groups and leadership roles.",
        fields: narrative(
          "professionalAssociations",
          "Groups and offices held."
        ),
      },
      {
        id: "mentors",
        title: "Mentors",
        hint: "People who influenced their career.",
        fields: narrative("mentors", "Career influences."),
      },
      {
        id: "businessOperations",
        title: "Business Operations",
        hint: "What the customer's business actually does.",
        fields: narrative("businessOperations", "Day-to-day business."),
      },
      {
        id: "keyDecisionMakers",
        title: "Key Decision Makers",
        hint: "Who they rely on for choices.",
        fields: narrative("keyDecisionMakers", "Decision makers and roles."),
      },
      {
        id: "decisionMakerRelationships",
        title: "Decision Maker Relationships",
        hint: "Quality of internal decision-maker relationships.",
        fields: narrative(
          "decisionMakerRelationships",
          "Relationship quality and why."
        ),
      },
      {
        id: "internalCompanyConnections",
        title: "Internal Company Connections",
        hint: "Who else in your company knows this customer.",
        fields: narrative(
          "internalCompanyConnections",
          "Colleagues with relationships."
        ),
      },
      {
        id: "natureOfInternalConnections",
        title: "Nature of Internal Connections",
        hint: "Connection type and history.",
        fields: narrative(
          "natureOfInternalConnections",
          "How connections were formed."
        ),
      },
      {
        id: "longRangeBusinessObjective",
        title: "Long-Range Business Objective",
        hint: "Ultimate career or corporate milestone.",
        fields: narrative(
          "longRangeBusinessObjective",
          "Long-term goals."
        ),
      },
    ],
  },
  {
    id: "clubsAndService",
    title: "Clubs & Service Organizations",
    groups: [
      {
        id: "professionalServiceClubs",
        title: "Professional & Service Clubs",
        hint: "Masons, Rotary, Kiwanis, etc.",
        fields: narrative("professionalServiceClubs", "Memberships."),
      },
      {
        id: "politicalActivity",
        title: "Political Activity",
        hint: "Party alignment and importance of politics.",
        fields: narrative("politicalActivity", "Political involvement."),
      },
      {
        id: "communityActivism",
        title: "Community Activism",
        hint: "Local programs and initiatives.",
        fields: narrative("communityActivism", "Community involvement."),
      },
      {
        id: "religion",
        title: "Religion",
        hint: "Affiliation and level of participation.",
        fields: narrative("religion", "Religious affiliation."),
      },
    ],
  },
  {
    id: "education",
    title: "Education",
    groups: [
      {
        id: "highSchool",
        title: "High School",
        fields: [
          f("highSchool", "School Name", "High school attended.", true),
          f("highSchoolGradYear", "Graduation Year", "Year graduated.", true),
        ],
      },
      {
        id: "college",
        title: "College / University",
        fields: [
          f("college", "School Name", "Undergraduate institution.", true),
          f("collegeGradYear", "Graduation Year", "Year graduated.", true),
          f("collegeDegree", "Degree", "Degree and major (e.g. BS Finance).", true),
        ],
      },
      {
        id: "academicHonors",
        title: "Academic Honors",
        hint: "Dean's list, scholarships, Latin honors, etc.",
        fields: narrative("academicHonors", "List honors and achievements."),
      },
      {
        id: "advancedDegrees",
        title: "Advanced Degrees",
        hint: "MBA, JD, MD, PhD, etc.",
        fields: narrative("advancedDegrees", "List advanced degrees."),
      },
      {
        id: "fraternitySorority",
        title: "Fraternity / Sorority",
        fields: [
          f(
            "fraternitySorority",
            "Affiliation",
            "Greek life affiliation and chapter.",
            true
          ),
        ],
      },
      {
        id: "extracurricularActivities",
        title: "Extracurricular Activities",
        hint: "Clubs, student government, athletics.",
        fields: narrative(
          "extracurricularActivities",
          "Major college activities."
        ),
      },
      {
        id: "nonCollegeSensitivity",
        title: "Non-College Sensitivity",
        hint: "If they didn't attend college — sensitivity and alternatives.",
        fields: narrative(
          "nonCollegeSensitivity",
          "Sensitivity and what they did instead."
        ),
      },
    ],
  },
  {
    id: "lifestyleAndHealth",
    title: "Lifestyle & Health",
    groups: [
      {
        id: "medicalHistory",
        title: "Medical History",
        fields: narrative("medicalHistory", "Current health considerations."),
      },
      {
        id: "drinkingHabits",
        title: "Drinking Habits",
        fields: narrative("drinkingHabits", "What and how much they drink."),
      },
      {
        id: "nonDrinkerSensitivity",
        title: "Non-Drinker Sensitivity",
        fields: narrative(
          "nonDrinkerSensitivity",
          "Offended by others drinking?"
        ),
      },
      {
        id: "smokingHabits",
        title: "Smoking Habits",
        fields: narrative(
          "smokingHabits",
          "Smoker? Mind if others smoke?"
        ),
      },
      {
        id: "lunchPreferences",
        title: "Lunch Preferences",
        fields: narrative("lunchPreferences", "Favorite midday spots."),
      },
      {
        id: "dinnerPreferences",
        title: "Dinner Preferences",
        fields: narrative("dinnerPreferences", "Favorite evening spots."),
      },
      {
        id: "menuSpecialties",
        title: "Menu Specialties",
        fields: narrative("menuSpecialties", "Dishes they love."),
      },
      {
        id: "hostingComfort",
        title: "Hosting Comfort",
        fields: narrative(
          "hostingComfort",
          "Object to others paying for meals?"
        ),
      },
      {
        id: "hobbiesRecreation",
        title: "Hobbies & Recreation",
        fields: narrative("hobbiesRecreation", "Sports, collections, arts."),
      },
      {
        id: "vacationHabits",
        title: "Vacation Habits",
        fields: narrative("vacationHabits", "Destinations and travel style."),
      },
      {
        id: "spectatorSports",
        title: "Spectator Sports",
        fields: narrative("spectatorSports", "Favorite teams and sports."),
      },
      {
        id: "sportsTickets",
        title: "Sports Tickets",
        fields: narrative("sportsTickets", "Ticket buying habits."),
      },
      {
        id: "car",
        title: "Car",
        hint: "Vehicle they drive.",
        fields: [
          f("carMake", "Make", "Manufacturer.", true),
          f("carModel", "Model", "Model name.", true),
          f("carYear", "Year", "Model year.", true),
          f("carCondition", "Condition / Notes", "New, leased, vintage, etc.", true),
        ],
      },
      {
        id: "conversationalSweetSpots",
        title: "Conversational Sweet Spots",
        fields: narrative(
          "conversationalSweetSpots",
          "Topics that get them talking."
        ),
      },
      {
        id: "conversationalSoftSpots",
        title: "Conversational Soft Spots",
        fields: narrative(
          "conversationalSoftSpots",
          "Areas they are protective or proud of."
        ),
      },
      {
        id: "targetPersona",
        title: "Target Persona",
        fields: narrative("targetPersona", "How they want to be perceived."),
      },
      {
        id: "coreSelfPerception",
        title: "Core Self-Perception",
        fields: narrative(
          "coreSelfPerception",
          "What they're proudest of accomplishing."
        ),
      },
    ],
  },
  {
    id: "militaryService",
    title: "Military Service",
    groups: [
      {
        id: "militaryService",
        title: "Military Service",
        hint: "Branch, rank, years served, and attitude toward service.",
        fields: [
          f("militaryBranch", "Branch", "Army, Navy, Air Force, etc.", true),
          f("militaryRankAtDischarge", "Rank at Discharge", "Final rank.", true),
          f("militaryServiceYears", "Years of Service", "Dates or total years.", true),
          f(
            "militaryAttitude",
            "Attitude Toward Service",
            "How they feel about their military experience."
          ),
        ],
      },
    ],
  },
];

export function getSectionFields(
  section: ContactProfileSection
): ContactProfileFieldDef[] {
  return section.groups.flatMap((group) => group.fields);
}

export function getAllProfileFields(): ContactProfileFieldDef[] {
  return CONTACT_PROFILE_SECTIONS.flatMap(getSectionFields);
}

export type ProfileFieldInContext = ContactProfileFieldDef & {
  group: ContactProfileFieldGroup;
  section: ContactProfileSection;
};

export function getAllProfileFieldsInContext(): ProfileFieldInContext[] {
  return CONTACT_PROFILE_SECTIONS.flatMap((section) =>
    section.groups.flatMap((group) =>
      group.fields.map((field) => ({ ...field, group, section }))
    )
  );
}

const VALID_PROFILE_KEYS = new Set(
  getAllProfileFields().map((field) => field.key)
);

/** Maps retired combined field keys to new granular keys (best-effort). */
const LEGACY_PROFILE_MIGRATIONS: Record<string, ContactProfileFieldKey> = {
  nameAndNickname: "firstName",
  companyNameAndAddress: "companyName",
  homeAddress: "homeAddressLine1",
  phoneNumbers: "businessPhone",
  emailAddresses: "businessEmail",
  birthDatePlaceHometown: "birthPlace",
  physicalCharacteristics: "physicalCharacteristicsNotes",
  highSchoolCollege: "college",
  academicHonorsDegrees: "academicHonors",
  maritalStatusSpouseName: "maritalStatus",
  children: "child1Name",
  militaryBackground: "militaryAttitude",
  carPreferences: "carMake",
};

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function parseContactNameForProfile(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const name = fullName.trim();
  if (!name) return { firstName: "", lastName: "" };

  if (name.includes(",")) {
    const [lastPart, ...rest] = name.split(",").map((part) => part.trim());
    const first = rest.join(" ").trim();
    if (!first) return { firstName: lastPart, lastName: "" };
    return { firstName: first, lastName: lastPart };
  }

  return splitFullName(name);
}

export function getRelationshipTreeSectionTitle(contactName: string): string {
  const { firstName } = parseContactNameForProfile(contactName);
  const name = firstName.trim() || contactName.trim();
  if (!name) return "Relationship Tree";
  return `${name}'s Relationship Tree`;
}

export function ensureProfileNameFromContact(
  profile: ContactProfile | undefined,
  contactName: string
): ContactProfile {
  const result = sanitizeContactProfile(profile);
  const { firstName, lastName } = parseContactNameForProfile(contactName);

  if (!result.firstName?.trim() && firstName) {
    result.firstName = firstName;
  }
  if (!result.lastName?.trim() && lastName) {
    result.lastName = lastName;
  }

  return result;
}

export function composeContactName(
  profile: ContactProfile | undefined,
  fallback?: string
): string {
  if (!profile) return fallback?.trim() ?? "";

  const parts = [profile.firstName, profile.middleName, profile.lastName]
    .map((v) => v?.trim())
    .filter(Boolean) as string[];

  if (parts.length > 0) return parts.join(" ");
  if (profile.nickname?.trim()) return profile.nickname.trim();
  return fallback?.trim() ?? "";
}

export function applyParsedScalarsToProfile(
  profile: ContactProfile,
  parsed: { name?: string | null; company?: string | null }
): ContactProfile {
  const result = { ...profile };

  if (parsed.name?.trim() && !result.firstName && !result.lastName) {
    const { firstName, lastName } = parseContactNameForProfile(parsed.name);
    if (firstName) result.firstName = firstName;
    if (lastName) result.lastName = lastName;
  }

  if (parsed.company?.trim() && !result.companyName?.trim()) {
    result.companyName = parsed.company.trim();
  }

  return result;
}

function migrateLegacyProfileKeys(
  profile: Record<string, unknown>
): ContactProfile {
  const migrated: ContactProfile = {};

  for (const [key, value] of Object.entries(profile)) {
    if (typeof value !== "string" || !value.trim()) continue;

    if (KINSIGHT_PROFILE_META_KEYS.includes(key as keyof KinSightProfileMeta)) {
      migrated[key as keyof KinSightProfileMeta] = value.trim();
      continue;
    }

    if (VALID_PROFILE_KEYS.has(key as ContactProfileFieldKey)) {
      migrated[key as ContactProfileFieldKey] = value.trim();
      continue;
    }

    const target = LEGACY_PROFILE_MIGRATIONS[key];
    if (target && !migrated[target]) {
      migrated[target] = value.trim();
    }
  }

  return migrated;
}

export function groupFilledCount(
  profile: ContactProfile,
  group: ContactProfileFieldGroup
): { filled: number; total: number } {
  const filled = group.fields.filter((field) => profile[field.key]?.trim()).length;
  return { filled, total: group.fields.length };
}

export function countProfileFieldsFilled(profile: ContactProfile | undefined): number {
  if (!profile) return 0;
  return Object.values(profile).filter((v) => v?.trim()).length;
}

export function countProfileFieldsTotal(): number {
  return getAllProfileFields().length;
}

export function sanitizeContactProfile(
  profile: ContactProfile | undefined
): ContactProfile {
  if (!profile || typeof profile !== "object") return {};

  const withLegacy = migrateLegacyProfileKeys(
    profile as Record<string, unknown>
  );

  const cleaned: ContactProfile = {};
  for (const field of getAllProfileFields()) {
    const value = withLegacy[field.key];
    if (typeof value === "string" && value.trim()) {
      cleaned[field.key] = value.trim();
    }
  }

  for (const key of KINSIGHT_PROFILE_META_KEYS) {
    const value =
      (profile as ContactProfile)[key] ??
      withLegacy[key];
    if (typeof value === "string" && value.trim()) {
      cleaned[key] = value.trim();
    }
  }

  return normalizeProfileDateFields(cleaned);
}

export function profileFieldExportLabel(
  field: ContactProfileFieldDef,
  group: ContactProfileFieldGroup
): string {
  if (group.fields.length === 1) {
    return group.title;
  }
  return `${group.title} - ${field.label}`;
}

export function findProfileFieldGroup(
  fieldKey: ContactProfileFieldKey
): ContactProfileFieldGroup | undefined {
  for (const section of CONTACT_PROFILE_SECTIONS) {
    for (const group of section.groups) {
      if (group.fields.some((field) => field.key === fieldKey)) {
        return group;
      }
    }
  }
  return undefined;
}

export function getProfileFieldLabel(fieldKey: ContactProfileFieldKey): string {
  for (const field of getAllProfileFieldsInContext()) {
    if (field.key === fieldKey) {
      return profileFieldExportLabel(field, field.group);
    }
  }
  return fieldKey;
}

export function getProfileSection(
  sectionId: string
): ContactProfileSection | undefined {
  return CONTACT_PROFILE_SECTIONS.find((section) => section.id === sectionId);
}

function normalizedProfileValue(value: string | undefined): string {
  return value?.trim() ?? "";
}

const CUSTOMER_INFO_META_KEYS = [
  "__kinsightRelationship",
  "__kinsightPrimaryRelationshipType",
] as const;

function isCustomerInfoMetaDirty(
  draft: ContactProfile,
  saved: ContactProfile
): boolean {
  return CUSTOMER_INFO_META_KEYS.some(
    (key) =>
      normalizedProfileValue(draft[key]) !== normalizedProfileValue(saved[key])
  );
}

function applyCustomerInfoMetaFromSource(
  target: ContactProfile,
  source: ContactProfile
): ContactProfile {
  const result = { ...target };

  for (const key of CUSTOMER_INFO_META_KEYS) {
    const value = source[key];
    if (value?.trim()) {
      result[key] = value.trim();
    } else {
      delete result[key];
    }
  }

  return result;
}

export function isProfileSectionDirty(
  draft: ContactProfile,
  saved: ContactProfile,
  sectionId: string
): boolean {
  if (sectionId === "relationshipTree") {
    return (
      normalizedProfileValue(draft.__kinsightRelationshipTree) !==
      normalizedProfileValue(saved.__kinsightRelationshipTree)
    );
  }

  if (sectionId === "socialMedia") {
    return (
      normalizedProfileValue(draft.__kinsightSocialMedia) !==
      normalizedProfileValue(saved.__kinsightSocialMedia)
    );
  }

  const section = getProfileSection(sectionId);
  if (!section) return false;

  const fieldsDirty = getSectionFields(section).some(
    (field) =>
      normalizedProfileValue(draft[field.key]) !==
      normalizedProfileValue(saved[field.key])
  );

  if (sectionId === "customerInfo") {
    return fieldsDirty || isCustomerInfoMetaDirty(draft, saved);
  }

  return fieldsDirty;
}

export function applyProfileSectionFromSource(
  target: ContactProfile,
  source: ContactProfile,
  sectionId: string
): ContactProfile {
  const result = { ...target };

  if (sectionId === "relationshipTree") {
    const value = source.__kinsightRelationshipTree;
    if (value?.trim()) {
      result.__kinsightRelationshipTree = value.trim();
    } else {
      delete result.__kinsightRelationshipTree;
    }
    return result;
  }

  if (sectionId === "socialMedia") {
    const value = source.__kinsightSocialMedia;
    if (value?.trim()) {
      result.__kinsightSocialMedia = value.trim();
    } else {
      delete result.__kinsightSocialMedia;
    }
    return result;
  }

  const section = getProfileSection(sectionId);
  if (!section) return result;

  for (const field of getSectionFields(section)) {
    const value = source[field.key];
    if (value?.trim()) {
      result[field.key] = value.trim();
    } else {
      delete result[field.key];
    }
  }

  if (sectionId === "customerInfo") {
    return applyCustomerInfoMetaFromSource(result, source);
  }

  return result;
}

export function revertProfileSection(
  draft: ContactProfile,
  saved: ContactProfile,
  sectionId: string
): ContactProfile {
  return applyProfileSectionFromSource(draft, saved, sectionId);
}

export function mergeProfileSectionForSave(
  saved: ContactProfile,
  draft: ContactProfile,
  sectionId: string
): ContactProfile {
  return applyProfileSectionFromSource({ ...saved }, draft, sectionId);
}

const LINKEDIN_ENRICHMENT_PROFILE_KEYS = [
  "companyName",
  "companyCity",
  "businessOperations",
] as const;

export function mergeLinkedInEnrichmentForSave(
  saved: ContactProfile,
  draft: ContactProfile
): ContactProfile {
  const result = applyProfileSectionFromSource({ ...saved }, draft, "socialMedia");

  for (const key of LINKEDIN_ENRICHMENT_PROFILE_KEYS) {
    const value = draft[key];
    if (value?.trim()) {
      result[key] = value.trim();
    }
  }

  return result;
}
