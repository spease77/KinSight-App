import { normalizeMeetingDate } from "@/lib/dates/contact-dates";
import {
  inferContactTypeHeuristic,
  isContactType,
  CONTACT_TYPE_PARSE_INSTRUCTIONS,
  type ContactType,
} from "@/lib/contacts/contact-type";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import {
  multiContactParseSchema,
  type ProposedPersonParse,
} from "@/lib/ai/multi-contact-schema";
import { MODELS } from "@/lib/ai/models";
import {
  buildRequestContext,
  type AiRequestContext,
} from "@/lib/ai/request-context";
import { buildSharedModelInstructions } from "@/lib/ai/shared-model-instructions";
import {
  CONTACT_PROFILE_SECTIONS,
  sanitizeContactProfile,
  splitFullName,
  type ContactProfileFieldKey,
} from "@/types/contact-profile";
import { getAllProfileFields } from "@/types/contact-profile";

const validProfileKeys = new Set(
  getAllProfileFields().map((field) => field.key)
);

const PROFILE_FIELD_LIST = CONTACT_PROFILE_SECTIONS.flatMap((section) =>
  section.groups.map(
    (group) =>
      `${group.title}: ${group.fields.map((f) => f.key).join(", ")}`
  )
).join("\n");

function sanitizeProfileUpdates(
  raw: Record<string, string>
): Partial<Record<ContactProfileFieldKey, string>> {
  const result: Partial<Record<ContactProfileFieldKey, string>> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!validProfileKeys.has(key as ContactProfileFieldKey)) continue;
    if (value?.trim()) {
      result[key as ContactProfileFieldKey] = value.trim();
    }
  }
  return result;
}

export type ParsedProposedPerson = {
  displayName: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  company?: string;
  role?: string;
  notes?: string;
  lastContact?: string;
  lastMeetingDate?: string;
  nextSteps?: string;
  topics?: string[];
  contactType?: ContactType;
  contactTypeNeedsConfirmation?: boolean;
  relationshipHint?: string;
  recordAs?: "contact" | "connection";
  connectionAnchorName?: string;
  profile: Partial<Record<ContactProfileFieldKey, string>>;
  sourceSnippets: Record<string, string>;
};

function toParsedPerson(raw: ProposedPersonParse): ParsedProposedPerson {
  const profile = sanitizeProfileUpdates(raw.profileUpdates ?? {});
  const { firstName, lastName } = splitFullName(raw.displayName);

  if (raw.firstName?.trim()) profile.firstName = raw.firstName.trim();
  else if (!profile.firstName && firstName) profile.firstName = firstName;

  if (raw.lastName?.trim()) profile.lastName = raw.lastName.trim();
  else if (!profile.lastName && lastName) profile.lastName = lastName;

  if (raw.nickname?.trim()) profile.nickname = raw.nickname.trim();

  if (raw.company?.trim() && !profile.companyName) {
    profile.companyName = raw.company.trim();
  }

  const sourceSnippets: Record<string, string> = {};
  for (const [key, snippet] of Object.entries(raw.sourceSnippets ?? {})) {
    if (snippet?.trim()) sourceSnippets[key] = snippet.trim();
  }

  const contextText = [
    raw.displayName,
    raw.company,
    raw.role,
    raw.notes,
    raw.relationshipHint,
  ]
    .filter(Boolean)
    .join(" ");

  let contactType = isContactType(raw.contact_type) ? raw.contact_type : undefined;
  let contactTypeNeedsConfirmation = raw.contact_type_needs_confirmation ?? false;

  if (!contactType) {
    const inferred = inferContactTypeHeuristic(contextText, {
      company: raw.company,
      role: raw.role,
    });
    contactType = inferred.contactType ?? undefined;
    contactTypeNeedsConfirmation =
      inferred.needsConfirmation || contactTypeNeedsConfirmation;
  }

  return {
    displayName: raw.displayName.trim(),
    firstName: profile.firstName,
    lastName: profile.lastName,
    nickname: profile.nickname,
    company: raw.company?.trim() || profile.companyName,
    role: raw.role?.trim() || undefined,
    notes: raw.notes?.trim() || undefined,
    lastContact: raw.last_contact?.trim() || undefined,
    lastMeetingDate: raw.last_meeting_date?.trim()
      ? normalizeMeetingDate(raw.last_meeting_date) ?? raw.last_meeting_date.trim()
      : undefined,
    nextSteps: raw.next_steps?.trim() || undefined,
    topics: raw.topics?.filter(Boolean) ?? undefined,
    contactType,
    contactTypeNeedsConfirmation,
    relationshipHint: raw.relationshipHint?.trim() || undefined,
    recordAs:
      raw.recordAs ??
      (raw.connectionAnchorName?.trim() || raw.relationshipHint?.trim()
        ? "connection"
        : "contact"),
    connectionAnchorName: raw.connectionAnchorName?.trim() || undefined,
    profile: sanitizeContactProfile(profile),
    sourceSnippets,
  };
}

export async function parseMultiContactNote(
  transcript: string,
  requestContext: AiRequestContext = buildRequestContext("voice")
): Promise<ParsedProposedPerson[]> {
  const voiceSnippetRules =
    requestContext.entry_method === "voice"
      ? `4. sourceSnippets per person: REQUIRED — verbatim quotes from the note for each field you populate for that person.`
      : `4. sourceSnippets: leave {} for each person — manual notes do not use audio snippets.`;

  try {
  const { object } = await generateObject({
    model: openai(MODELS.parse),
    schema: multiContactParseSchema,
    schemaName: "MultiContactNote",
    schemaDescription:
      "Distinct people mentioned in a relationship note, each with their own facts",
    prompt: `${buildSharedModelInstructions(requestContext)}

You extract EVERY distinct person mentioned in a hospitality relationship note.

RULES:
1. Return one entry per person who is named or clearly identified — including spouses, children, parents, assistants, and colleagues as soon as a first name is given.
2. Assign facts ONLY to the person they describe. Never put the anchor's hobbies, work, guns, politics, or cars on a family member.
3. When the note is ABOUT a saved contact (e.g. Chuck Wilk, Pat Pease) and names their family or network ("his wife Stacy", "Chuck's son Ryan", "Denisse's husband Marcus"):
   - ALWAYS add that named person as a **connection**, not a top-level contact.
   - Set recordAs to "connection" and connectionAnchorName to the anchor's full name (e.g. "Chuck Wilk").
   - Set relationshipHint like "wife of Chuck Wilk" or "son of Chuck Wilk".
   - Put details that belong to the connection (job, birthday, hobbies, kids) in THAT person's notes — one fact per line. Those become facts on their Family & Connections card.
   - Do NOT only mention them in the anchor's notes. They must be their own contacts[] entry.
4. If two people are both independent clients, they can both be recordAs "contact". Family of a client is still a connection under that client.
5. Use atomic profile keys (firstName, lastName, spouseFirstName, companyCity, etc.).
6. Use null for fields not stated about that person.
${voiceSnippetRules}
7. Resolve relative meeting dates per person into last_meeting_date (MM-DD-YYYY).
8. Resolve birthDate and weddingAnniversary to MM-DD-YYYY in profileUpdates.
9. ${CONTACT_TYPE_PARSE_INSTRUCTIONS} — assign contact_type per person independently.

Valid profile field keys:
${PROFILE_FIELD_LIST}

Note:
"""
${transcript.trim()}
"""`,
    providerOptions: {
      openai: {
        // z.record() is not valid in OpenAI strict mode and was aborting
        // contact detection before notes could be saved.
        strictJsonSchema: false,
      },
    },
  });

  const seen = new Set<string>();
  const people: ParsedProposedPerson[] = [];

  for (const raw of object.contacts) {
    if (!raw.displayName?.trim()) continue;
    const key = raw.displayName.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    people.push(toParsedPerson(raw));
  }

  return people;
  } catch (err) {
    console.error("parseMultiContactNote failed:", err);
    return [];
  }
}
