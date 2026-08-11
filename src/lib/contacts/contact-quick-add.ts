import type { ContactDetail } from "@/types/contact";
import {
  FAMILY_RELATIONSHIP_TYPES,
  parseRelationshipTree,
  KINSIGHT_RELATIONSHIP_TREE_KEY,
  type RelationshipType,
} from "@/lib/contacts/relationship-tree";
import {
  KINSIGHT_SOCIAL_MEDIA_KEY,
  parseSocialMedia,
} from "@/lib/contacts/social-media";
import { sanitizeContactProfile } from "@/types/contact-profile";

export type QuickAddPromptId =
  | "friend"
  | "family"
  | "coworker"
  | "mentor"
  | "interest"
  | "religion"
  | "education"
  | "military"
  | "club"
  | "businessBackground"
  | "socialHandle"
  | "note"
  | "customField";

export type QuickAddPrompt = {
  id: QuickAddPromptId;
  label: string;
  drawerTitle: string;
  drawerHint?: string;
  chipLabel?: string;
};

export const QUICK_ADD_PROMPTS: QuickAddPrompt[] = [
  {
    id: "friend",
    label: "Friend",
    chipLabel: "Friend",
    drawerTitle: "Add Friend",
    drawerHint: "Add someone in their personal circle.",
  },
  {
    id: "family",
    label: "Family",
    chipLabel: "Family",
    drawerTitle: "Add Family",
    drawerHint: "Add a spouse, parent, child, or relative.",
  },
  {
    id: "coworker",
    label: "Coworker",
    chipLabel: "Coworker",
    drawerTitle: "Add Coworker",
    drawerHint: "Professional connections and colleagues.",
  },
  {
    id: "mentor",
    label: "Mentor",
    chipLabel: "Mentor",
    drawerTitle: "Add Mentor",
    drawerHint: "Someone who guides or influences their career.",
  },
  {
    id: "interest",
    label: "Interest",
    chipLabel: "Interest",
    drawerTitle: "Add Interest",
    drawerHint: "Hobbies, sports, passions, or recreation.",
  },
  {
    id: "religion",
    label: "Religion",
    chipLabel: "Religion",
    drawerTitle: "Add Religion / Faith",
    drawerHint: "Affiliation and level of participation.",
  },
  {
    id: "education",
    label: "Education",
    chipLabel: "Education",
    drawerTitle: "Add Education",
    drawerHint: "Schools, degrees, and academic background.",
  },
  {
    id: "military",
    label: "Military Service",
    chipLabel: "Military Service",
    drawerTitle: "Add Military Service",
    drawerHint: "Branch, rank, years served, and attitude toward service.",
  },
  {
    id: "club",
    label: "Club / Organization",
    chipLabel: "Club",
    drawerTitle: "Add Club / Organization",
    drawerHint: "Professional clubs, service orgs, or memberships.",
  },
  {
    id: "businessBackground",
    label: "Business Background",
    chipLabel: "Business Background",
    drawerTitle: "Add Business Background",
    drawerHint: "What they do, career history, and business context.",
  },
  {
    id: "socialHandle",
    label: "Social Handle",
    chipLabel: "Social Handle",
    drawerTitle: "Add Social Handle",
    drawerHint: "LinkedIn, website, or other social profile URL.",
  },
  {
    id: "note",
    label: "Note",
    chipLabel: "Note",
    drawerTitle: "Add Note",
    drawerHint: "Capture a quick update or observation.",
  },
  {
    id: "customField",
    label: "Custom Field",
    chipLabel: "Custom Field",
    drawerTitle: "Add Custom Field",
    drawerHint: "Fill in any open profile field.",
  },
];

export const DEFAULT_CHIP_PROMPT_IDS: QuickAddPromptId[] = [
  "friend",
  "family",
  "interest",
  "coworker",
  "note",
  "religion",
];

export const QUICK_ADD_BROWSE_GROUPS: {
  title: string;
  promptIds: QuickAddPromptId[];
}[] = [
  {
    title: "Relationships & People",
    promptIds: ["friend", "family", "coworker", "mentor"],
  },
  {
    title: "Personal Intel",
    promptIds: ["interest", "religion", "education", "military"],
  },
  {
    title: "Professional & Clubs",
    promptIds: ["club", "businessBackground", "socialHandle"],
  },
  {
    title: "Logistical",
    promptIds: ["note", "customField"],
  },
];

const PROMPT_MAP = new Map(
  QUICK_ADD_PROMPTS.map((prompt) => [prompt.id, prompt])
);

const FRIEND_RELATIONSHIP_TYPES: RelationshipType[] = [
  "best_friend",
  "associate",
  "neighbor",
  "alumnus_classmate",
];

const COWORKER_RELATIONSHIP_TYPES: RelationshipType[] = [
  "coworker",
  "boss_report",
  "business_partner",
  "client_customer",
];

const MENTOR_RELATIONSHIP_TYPES: RelationshipType[] = ["mentor"];

function hasRelationshipTypes(
  contact: ContactDetail,
  types: RelationshipType[]
): boolean {
  const profile = sanitizeContactProfile(contact.profile);
  const entries = parseRelationshipTree(profile[KINSIGHT_RELATIONSHIP_TREE_KEY]);
  const allowed = new Set(types);

  return entries.some((entry) =>
    entry.relationshipType ? allowed.has(entry.relationshipType) : false
  );
}

export function getQuickAddPrompt(
  promptId: QuickAddPromptId
): QuickAddPrompt | undefined {
  return PROMPT_MAP.get(promptId);
}

export function isQuickAddPromptVisible(
  contact: ContactDetail,
  promptId: QuickAddPromptId
): boolean {
  const profile = sanitizeContactProfile(contact.profile);

  switch (promptId) {
    case "friend":
      return !hasRelationshipTypes(contact, FRIEND_RELATIONSHIP_TYPES);
    case "family":
      return !hasRelationshipTypes(
        contact,
        Array.from(FAMILY_RELATIONSHIP_TYPES)
      );
    case "coworker":
      return !hasRelationshipTypes(contact, COWORKER_RELATIONSHIP_TYPES);
    case "mentor":
      return !hasRelationshipTypes(contact, MENTOR_RELATIONSHIP_TYPES);
    case "interest":
      return !profile.hobbiesRecreation?.trim();
    case "religion":
      return !profile.religion?.trim();
    case "education":
      return (
        !profile.highSchool?.trim() &&
        !profile.college?.trim() &&
        !profile.collegeDegree?.trim()
      );
    case "military":
      return !profile.militaryBranch?.trim();
    case "club":
      return !profile.professionalServiceClubs?.trim();
    case "businessBackground":
      return (
        !profile.businessOperations?.trim() &&
        !profile.previousEmployment?.trim()
      );
    case "socialHandle":
      return parseSocialMedia(profile[KINSIGHT_SOCIAL_MEDIA_KEY]).length === 0;
    case "note":
    case "customField":
      return true;
    default:
      return true;
  }
}

export function getVisibleChipPrompts(contact: ContactDetail): QuickAddPrompt[] {
  return DEFAULT_CHIP_PROMPT_IDS
    .map((id) => PROMPT_MAP.get(id))
    .filter((prompt): prompt is QuickAddPrompt => Boolean(prompt))
    .filter((prompt) => isQuickAddPromptVisible(contact, prompt.id));
}

export function getDefaultRelationshipTypeForPrompt(
  promptId: QuickAddPromptId
): RelationshipType | "" {
  switch (promptId) {
    case "friend":
      return "best_friend";
    case "family":
      return "";
    case "coworker":
      return "coworker";
    case "mentor":
      return "mentor";
    default:
      return "";
  }
}

export function isFamilyRelationshipType(type: RelationshipType | ""): boolean {
  if (!type) return false;
  return FAMILY_RELATIONSHIP_TYPES.has(type);
}

export function isRelationshipQuickAddPrompt(promptId: QuickAddPromptId): boolean {
  return (
    promptId === "friend" ||
    promptId === "family" ||
    promptId === "coworker" ||
    promptId === "mentor"
  );
}
