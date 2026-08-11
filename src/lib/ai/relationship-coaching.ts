import { formatContactDateForDisplay, isContactDateProfileField } from "@/lib/dates/contact-dates";
import {
  formatNoteLogTimestamp,
  sortNotesNewestFirst,
} from "@/lib/contacts/notes-log";
import type { ContactDetail } from "@/types/contact";
import type { ContactProfileFieldKey } from "@/types/contact-profile";
import {
  CONTACT_PROFILE_SECTIONS,
  countProfileFieldsFilled,
  countProfileFieldsTotal,
  getProfileFieldLabel,
} from "@/types/contact-profile";

const COACHING_PRIORITY: ContactProfileFieldKey[] = [
  "conversationalSweetSpots",
  "hobbiesRecreation",
  "child1Name",
  "childrenInterests",
  "spouseInterests",
  "hometown",
  "birthDate",
  "college",
  "highSchool",
  "fraternitySorority",
  "spectatorSports",
  "vacationHabits",
  "longRangeBusinessObjective",
  "keyDecisionMakers",
  "buyingMotivation",
  "managementPriorities",
  "corePersonalProblems",
  "lunchPreferences",
  "dinnerPreferences",
  "professionalServiceClubs",
  "communityActivism",
  "mentors",
  "targetPersona",
  "coreSelfPerception",
  "decisionPatterns",
  "spouseFirstName",
  "maritalStatus",
  "militaryBranch",
  "businessOperations",
  "previousEmployment",
];

const QUESTION_STARTERS: Partial<Record<ContactProfileFieldKey, string>> = {
  conversationalSweetSpots:
    "What's something outside of work they light up talking about?",
  hobbiesRecreation:
    "What do they do for fun or to unwind — any sports, collections, or passions?",
  child1Name:
    "How are their kids doing — names, ages, anything they're proud of?",
  childrenInterests:
    "What are their children into right now — sports, school, hobbies?",
  spouseInterests:
    "What does their partner care about — hobbies, work, or causes?",
  hometown:
    "Where did they grow up, and do they still feel connected to that place?",
  birthDate:
    "Any upcoming birthday or milestone worth acknowledging?",
  college:
    "Where did they go to college, and do they stay in touch with anyone from there?",
  highSchool:
    "Where did they go to high school — still connected to that area?",
  fraternitySorority:
    "Were they involved in Greek life or campus organizations they still care about?",
  spectatorSports:
    "Do they follow any teams — worth inviting them to a game or asking about a recent match?",
  vacationHabits:
    "Where do they like to travel, and do they have a trip coming up?",
  longRangeBusinessObjective:
    "What's the big career or company milestone they're working toward?",
  keyDecisionMakers:
    "Who else weighs in on decisions like this, and how do they work together?",
  buyingMotivation:
    "What matters most when they choose a partner — price, quality, service, or the relationship?",
  managementPriorities:
    "What is their leadership team pushing hardest on right now?",
  corePersonalProblems:
    "What's the biggest headache on their plate professionally right now?",
  lunchPreferences:
    "Where do they like to go for a casual lunch meeting?",
  dinnerPreferences:
    "Any favorite spots for a longer dinner conversation?",
  professionalServiceClubs:
    "Are they active in Rotary, Masons, or similar groups?",
  communityActivism:
    "What community causes or local programs do they support?",
  mentors:
    "Who shaped their career — anyone they still look up to or mention often?",
  targetPersona:
    "How do they want to be seen — what identity matters most to them?",
  coreSelfPerception:
    "What accomplishment are they most proud of when you get them talking personally?",
  decisionPatterns:
    "How do they usually make big decisions — data, gut feel, or building consensus?",
  maritalStatus:
    "How's home life — partner's name and anything thoughtful to ask about them?",
  spouseFirstName:
    "How's their partner doing — anything personal to ask about?",
  militaryBranch:
    "Did they serve — branch, rank, and how do they feel about that chapter?",
  businessOperations:
    "In plain terms, what does their business actually do day to day?",
  previousEmployment:
    "Where did their career start, and what path brought them here?",
};

const NEVER_SUGGEST_PROBE: ContactProfileFieldKey[] = [
  "highlyConfidentialSensitive",
  "nonBusinessStrongOpinions",
  "medicalHistory",
  "nonCollegeSensitivity",
];

function getFieldLabel(key: ContactProfileFieldKey): string {
  return getProfileFieldLabel(key);
}

export interface ProfileGapSuggestion {
  field: ContactProfileFieldKey;
  label: string;
  questionIdea: string;
}

export interface RelationshipCoachingBrief {
  contactId: string;
  contactName: string;
  profileCompletion: { filled: number; total: number };
  knownHighlights: string[];
  priorityGaps: ProfileGapSuggestion[];
  topicsToAvoid: string[];
  coachingNote: string;
}

export function buildRelationshipCoachingBrief(
  contact: ContactDetail
): RelationshipCoachingBrief {
  const profile = contact.profile ?? {};
  const filled = countProfileFieldsFilled(profile);
  const total = countProfileFieldsTotal();

  const knownHighlights: string[] = [];
  if (contact.lastMeetingDate?.trim()) {
    knownHighlights.push(
      `Last meeting: ${formatContactDateForDisplay(contact.lastMeetingDate)}`
    );
  }
  if ((contact.notesLog?.length ?? 0) > 0) {
    for (const entry of sortNotesNewestFirst(contact.notesLog).slice(0, 8)) {
      const preview =
        entry.content.length > 300
          ? `${entry.content.slice(0, 299)}…`
          : entry.content;
      knownHighlights.push(
        `Notes (${formatNoteLogTimestamp(entry.recordedAt)}): ${preview}`
      );
    }
  } else if (contact.notes?.trim()) {
    knownHighlights.push(`Notes: ${contact.notes.trim()}`);
  }
  if (contact.nextSteps?.trim()) {
    knownHighlights.push(`Next steps: ${contact.nextSteps.trim()}`);
  }
  if (contact.topics?.length) {
    knownHighlights.push(`Topics: ${contact.topics.join(", ")}`);
  }

  for (const section of CONTACT_PROFILE_SECTIONS) {
    for (const group of section.groups) {
      for (const field of group.fields) {
        const value = profile[field.key]?.trim();
        if (value) {
          const label =
            group.fields.length === 1
              ? group.title
              : `${group.title} — ${field.label}`;
          const display = isContactDateProfileField(field.key)
            ? formatContactDateForDisplay(value)
            : value;
          knownHighlights.push(`${label}: ${display}`);
        }
      }
    }
  }

  const topicsToAvoid: string[] = [];
  const sensitive = profile.highlyConfidentialSensitive?.trim();
  if (sensitive) topicsToAvoid.push(sensitive);
  const strongOpinions = profile.nonBusinessStrongOpinions?.trim();
  if (strongOpinions) topicsToAvoid.push(strongOpinions);

  const priorityGaps: ProfileGapSuggestion[] = [];

  for (const key of COACHING_PRIORITY) {
    if (NEVER_SUGGEST_PROBE.includes(key)) continue;
    if (profile[key]?.trim()) continue;

    priorityGaps.push({
      field: key,
      label: getFieldLabel(key),
      questionIdea:
        QUESTION_STARTERS[key] ??
        `Learn more about their ${getFieldLabel(key).toLowerCase()}.`,
    });

    if (priorityGaps.length >= 6) break;
  }

  const coachingNote =
    priorityGaps.length > 0
      ? "Use priorityGaps to suggest 2–3 natural questions for the user's NEXT conversation. Tie suggestions to what is already known. Build trust — never feel transactional."
      : "Profile is rich. Suggest deepening questions on known sweet spots, upcoming milestones, or follow-ups on next steps.";

  return {
    contactId: contact.id,
    contactName: contact.name,
    profileCompletion: { filled, total },
    knownHighlights: knownHighlights.slice(0, 20),
    priorityGaps,
    topicsToAvoid,
    coachingNote,
  };
}
