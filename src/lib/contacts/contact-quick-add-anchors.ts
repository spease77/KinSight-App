import type { ContactProfileFieldKey } from "@/types/contact-profile";
import type { RelationshipType } from "@/lib/contacts/relationship-tree";

export type QuickAddAnchorId = "person" | "interest" | "date" | "custom";

export type PersonSubtypeId =
  | "spouse"
  | "child"
  | "parent"
  | "assistant"
  | "mutual_friend"
  | "custom";

export type InterestSubtypeId =
  | "hobby"
  | "favorite_food"
  | "sports_team"
  | "current_goal"
  | "dislike_dietary"
  | "custom";

export type InterestQuickAddCategoryId =
  | "general"
  | "food_drink"
  | "goal"
  | "hobby";

export type InterestQuickAddCategory = {
  id: InterestQuickAddCategoryId;
  label: string;
  subtypeId: InterestSubtypeId;
  prefixValue?: boolean;
};

export type DateSubtypeId =
  | "birthday"
  | "anniversary"
  | "follow_up"
  | "key_milestone"
  | "custom";

export type PersonSubtype = {
  id: PersonSubtypeId;
  label: string;
  relationshipType: RelationshipType;
  inputLabel: string;
  inputPlaceholder: string;
  successMessage: string;
};

export type InterestSubtype = {
  id: InterestSubtypeId;
  label: string;
  fieldKey: ContactProfileFieldKey;
  sectionId: string;
  inputLabel: string;
  inputPlaceholder: string;
  successMessage: string;
  prefixValue?: boolean;
};

export type DateSubtype = {
  id: DateSubtypeId;
  kind: "profile_field" | "note";
  fieldKey?: ContactProfileFieldKey;
  sectionId?: string;
  label: string;
  inputLabel: string;
  inputPlaceholder: string;
  successMessage: string;
  notePrefix?: string;
};

export const QUICK_ADD_ANCHORS: {
  id: QuickAddAnchorId;
  label: string;
  drawerTitle: string;
  drawerHint: string;
}[] = [
  {
    id: "interest",
    label: "Interest",
    drawerTitle: "Add Interest",
    drawerHint: "Hobbies, tastes, goals, and preferences.",
  },
  {
    id: "person",
    label: "Person",
    drawerTitle: "Add Person",
    drawerHint: "Who are they connected to?",
  },
  {
    id: "date",
    label: "Date",
    drawerTitle: "Add Date",
    drawerHint: "Birthdays, anniversaries, and follow-ups.",
  },
];

export const PERSON_SUBTYPES: PersonSubtype[] = [
  {
    id: "spouse",
    label: "Spouse",
    relationshipType: "romantic_partner",
    inputLabel: "Spouse's name",
    inputPlaceholder: "Enter spouse's name",
    successMessage: "Spouse added",
  },
  {
    id: "child",
    label: "Child",
    relationshipType: "daughter",
    inputLabel: "Child's name",
    inputPlaceholder: "Enter child's name",
    successMessage: "Child added",
  },
  {
    id: "parent",
    label: "Parent",
    relationshipType: "mom",
    inputLabel: "Parent's name",
    inputPlaceholder: "Enter parent's name",
    successMessage: "Parent added",
  },
  {
    id: "assistant",
    label: "Assistant",
    relationshipType: "gatekeeper_assistant",
    inputLabel: "Assistant's name",
    inputPlaceholder: "Enter assistant's name",
    successMessage: "Assistant added",
  },
  {
    id: "mutual_friend",
    label: "Mutual Friend",
    relationshipType: "best_friend",
    inputLabel: "Friend's name",
    inputPlaceholder: "Enter friend's name",
    successMessage: "Friend added",
  },
];

export const INTEREST_SUBTYPES: InterestSubtype[] = [
  {
    id: "hobby",
    label: "Hobby / Passion",
    fieldKey: "hobbiesRecreation",
    sectionId: "lifestyleAndHealth",
    inputLabel: "Hobby or passion",
    inputPlaceholder: "e.g. Skiing, photography, cooking…",
    successMessage: "Interest saved",
    prefixValue: true,
  },
  {
    id: "favorite_food",
    label: "Favorite Food / Drink",
    fieldKey: "lunchPreferences",
    sectionId: "lifestyleAndHealth",
    inputLabel: "Favorite food or drink",
    inputPlaceholder: "e.g. Sushi, IPA, espresso…",
    successMessage: "Preference saved",
    prefixValue: true,
  },
  {
    id: "sports_team",
    label: "Sports Team",
    fieldKey: "spectatorSports",
    sectionId: "lifestyleAndHealth",
    inputLabel: "Sports team",
    inputPlaceholder: "e.g. Yankees, Chiefs, Lakers…",
    successMessage: "Sports team saved",
    prefixValue: true,
  },
  {
    id: "current_goal",
    label: "Current Goal",
    fieldKey: "longRangeBusinessObjective",
    sectionId: "businessBackground",
    inputLabel: "Current goal",
    inputPlaceholder: "What are they working toward?",
    successMessage: "Goal saved",
    prefixValue: true,
  },
  {
    id: "dislike_dietary",
    label: "Dislike / Dietary",
    fieldKey: "conversationalSoftSpots",
    sectionId: "lifestyleAndHealth",
    inputLabel: "Dislike or dietary note",
    inputPlaceholder: "e.g. No shellfish, hates cilantro…",
    successMessage: "Note saved",
    prefixValue: true,
  },
];

export const INTEREST_QUICK_ADD_CATEGORIES: InterestQuickAddCategory[] = [
  {
    id: "general",
    label: "General",
    subtypeId: "hobby",
    prefixValue: false,
  },
  {
    id: "food_drink",
    label: "Food/Drink",
    subtypeId: "favorite_food",
  },
  {
    id: "goal",
    label: "Goal",
    subtypeId: "current_goal",
  },
  {
    id: "hobby",
    label: "Hobby",
    subtypeId: "hobby",
  },
];

export const DATE_QUICK_ADD_LABELS = ["birthday", "anniversary", "other"] as const;

export function resolveDateSubtypeForLabel(label: string): {
  subtype: DateSubtype;
  customLabel?: string;
} {
  const normalized = label.trim().toLowerCase();
  const birthday =
    DATE_SUBTYPES.find((subtype) => subtype.id === "birthday") ??
    DATE_SUBTYPES[0];
  const anniversary =
    DATE_SUBTYPES.find((subtype) => subtype.id === "anniversary") ??
    DATE_SUBTYPES[0];
  const noteSubtype =
    DATE_SUBTYPES.find((subtype) => subtype.id === "follow_up") ??
    DATE_SUBTYPES[0];

  if (normalized === "birthday") {
    return { subtype: birthday };
  }
  if (normalized === "anniversary") {
    return { subtype: anniversary };
  }
  if (normalized === "milestone") {
    const milestone =
      DATE_SUBTYPES.find((subtype) => subtype.id === "key_milestone") ??
      noteSubtype;
    return { subtype: milestone };
  }

  return {
    subtype: noteSubtype,
    customLabel: label.trim() || "other",
  };
}

export const DATE_SUBTYPES: DateSubtype[] = [
  {
    id: "birthday",
    kind: "profile_field",
    fieldKey: "birthDate",
    sectionId: "customerInfo",
    label: "Birthday",
    inputLabel: "Birthday",
    inputPlaceholder: "MM-DD-YYYY or month/day",
    successMessage: "Birthday saved",
  },
  {
    id: "anniversary",
    kind: "profile_field",
    fieldKey: "weddingAnniversary",
    sectionId: "customerInfo",
    label: "Anniversary",
    inputLabel: "Anniversary",
    inputPlaceholder: "MM-DD-YYYY or month/day",
    successMessage: "Anniversary saved",
  },
  {
    id: "follow_up",
    kind: "note",
    label: "Follow-up Due",
    inputLabel: "Follow-up date or timing",
    inputPlaceholder: "e.g. Next Tuesday, Q3 2026…",
    successMessage: "Follow-up saved",
    notePrefix: "Follow-up due",
  },
  {
    id: "key_milestone",
    kind: "note",
    label: "Key Milestone",
    inputLabel: "Key milestone",
    inputPlaceholder: "e.g. Promotion, retirement, graduation…",
    successMessage: "Milestone saved",
    notePrefix: "Key milestone",
  },
];

export function getAnchorConfig(anchorId: QuickAddAnchorId) {
  return QUICK_ADD_ANCHORS.find((anchor) => anchor.id === anchorId);
}

export function getInterestQuickAddCategory(
  categoryId: InterestQuickAddCategoryId
): InterestQuickAddCategory {
  return (
    INTEREST_QUICK_ADD_CATEGORIES.find((category) => category.id === categoryId) ??
    INTEREST_QUICK_ADD_CATEGORIES[0]
  );
}

export function resolveInterestSubtypeForCategory(
  categoryId: InterestQuickAddCategoryId
): { subtype: InterestSubtype; prefixValue: boolean } {
  const category = getInterestQuickAddCategory(categoryId);
  const subtype =
    INTEREST_SUBTYPES.find((item) => item.id === category.subtypeId) ??
    INTEREST_SUBTYPES[0];

  return {
    subtype,
    prefixValue: category.prefixValue ?? subtype.prefixValue ?? false,
  };
}

export function splitQuickAddName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
