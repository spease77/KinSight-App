import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import {
  contactParseSchema,
  type ParsedContactFields,
} from "@/lib/ai/contact-schema";
import {
  sourcedTranscriptParseSchema,
  type SourcedTranscriptParse,
} from "@/lib/ai/sourced-parse-schema";
import { MODELS } from "@/lib/ai/models";
import { CONTACT_TYPE_PARSE_INSTRUCTIONS } from "@/lib/contacts/contact-type";
import {
  buildRequestContext,
  type AiRequestContext,
} from "@/lib/ai/request-context";
import { buildSharedModelInstructions } from "@/lib/ai/shared-model-instructions";
import { listPopulatedFieldKeys } from "@/lib/sources/apply-voice-sources";
import {
  CONTACT_PROFILE_SECTIONS,
  getAllProfileFields,
  type ContactProfileFieldKey,
} from "@/types/contact-profile";

const validProfileKeys = new Set(
  getAllProfileFields().map((field) => field.key)
);

export type ParsedTranscriptWithSources = {
  fields: ParsedContactFields;
  profile: Partial<Record<ContactProfileFieldKey, string>>;
  /** fieldKey → verbatim transcript snippet (from GPT-4o-mini) */
  sourceSnippets: Record<string, string>;
};

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

function sanitizeSourceSnippets(
  raw: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, snippet] of Object.entries(raw)) {
    if (snippet?.trim()) result[key] = snippet.trim();
  }
  return result;
}

function splitSourcedParse(
  object: SourcedTranscriptParse
): ParsedTranscriptWithSources {
  const { profileUpdates, sourceSnippets, ...scalarFields } = object;

  return {
    fields: contactParseSchema.parse(scalarFields),
    profile: sanitizeProfileUpdates(profileUpdates ?? {}),
    sourceSnippets: sanitizeSourceSnippets(sourceSnippets ?? {}),
  };
}

const PROFILE_FIELD_LIST = CONTACT_PROFILE_SECTIONS.flatMap((section) =>
  section.groups.map(
    (group) =>
      `${group.title}: ${group.fields.map((f) => f.key).join(", ")}`
  )
).join("\n");

export async function parseTranscriptWithSources(
  transcript: string,
  requestContext: AiRequestContext = buildRequestContext("voice")
): Promise<ParsedTranscriptWithSources> {
  const voiceSnippetRules =
    requestContext.entry_method === "voice"
      ? `3. sourceSnippets: REQUIRED — for EVERY field you populate (scalar or profile), add an entry with the SAME key mapping to an EXACT verbatim quote copied from the transcript. Do not paraphrase snippets.
4. Scalar source keys use camelCase: company, role, notes, lastContact, lastMeetingDate, nextSteps, topics, contactType.`
      : `3. sourceSnippets: leave as {} — manual entry does not use audio snippets (source_metadata is set server-side).`;

  const { object } = await generateObject({
    model: openai(MODELS.parse),
    schema: sourcedTranscriptParseSchema,
    schemaName: "SourcedContactInquiry",
    schemaDescription:
      "Contact fields extracted from a voice or manual note, with resolved dates and source rules",
    prompt: `${buildSharedModelInstructions(requestContext)}

You extract structured contact facts from a hospitality sales note.

RULES:
1. Use null for scalar fields not mentioned.
2. profileUpdates: only keys for relationship profile fields clearly stated. Use separate atomic keys — e.g. firstName, lastName, nickname (not combined name fields); companyName, companyAddressLine1, companyCity, companyState, companyZip (not one combined address); businessPhone, mobilePhone; child1Name, child1Age; carMake, carModel, carYear.
${voiceSnippetRules}
5. Resolve relative meeting dates into last_meeting_date (MM-DD-YYYY) using current_timestamp — see instructions above.
6. Resolve birthDate and weddingAnniversary to MM-DD-YYYY in profileUpdates — see calendar date instructions above.
7. If topics is an array, the snippet (voice only) should be the quote that mentions those topics.
8. ${CONTACT_TYPE_PARSE_INSTRUCTIONS}

Valid profile field keys:
${PROFILE_FIELD_LIST}

Transcript:
"""
${transcript.trim()}
"""`,
    providerOptions: {
      openai: {
        strictJsonSchema: true,
      },
    },
  });

  return splitSourcedParse(object);
}

/** Scalar-only parse (legacy). Prefer parseTranscriptWithSources for voice saves. */
export async function parseTranscriptFields(
  transcript: string,
  requestContext?: AiRequestContext
): Promise<ParsedContactFields> {
  const { fields } = await parseTranscriptWithSources(
    transcript,
    requestContext ?? buildRequestContext("voice")
  );
  return fields;
}

/** Field keys expected to receive source_metadata for a parse result */
export function collectExpectedSourceKeys(
  parsed: ParsedTranscriptWithSources
): string[] {
  return listPopulatedFieldKeys({
    parsed: parsed.fields,
    profileFields: parsed.profile,
  });
}
