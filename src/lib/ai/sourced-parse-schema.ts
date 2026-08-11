import { z } from "zod";
import { contactParseSchema } from "@/lib/ai/contact-schema";

/**
 * GPT-4o-mini returns extracted values plus sourceSnippets:
 * each field key maps to the verbatim transcript quote that proves the fact.
 */
export const sourcedTranscriptParseSchema = contactParseSchema.extend({
  profileUpdates: z
    .record(z.string())
    .default({})
    .describe(
      "Relationship profile field keys (e.g. firstName, lastName, child1Name) mapped to extracted values"
    ),
  sourceSnippets: z
    .record(z.string())
    .default({})
    .describe(
      "REQUIRED for every extracted field: map the same field key to an exact verbatim substring copied from the transcript. Keys use camelCase: company, role, notes, lastContact, nextSteps, topics, plus any profile field keys."
    ),
});

export type SourcedTranscriptParse = z.infer<typeof sourcedTranscriptParseSchema>;
