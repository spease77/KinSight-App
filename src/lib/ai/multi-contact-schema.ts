import { z } from "zod";

export const proposedPersonSchema = z.object({
  displayName: z
    .string()
    .describe(
      "Full name as mentioned (e.g. Pat Pease). Used for display and matching."
    ),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  nickname: z.string().nullable(),
  company: z.string().nullable(),
  role: z.string().nullable(),
  notes: z.string().nullable(),
  last_contact: z.string().nullable(),
  last_meeting_date: z
    .string()
    .nullable()
    .describe("Resolved MM-DD-YYYY when a meeting date is mentioned for this person"),
  next_steps: z.string().nullable(),
  topics: z.array(z.string()).nullable(),
  contact_type: z
    .enum(["professional", "personal", "family"])
    .nullable()
    .describe(
      "Relationship category for this person: professional, personal, or family. Null when ambiguous."
    ),
  contact_type_needs_confirmation: z
    .boolean()
    .default(false)
    .describe(
      "True when only a name is given with no relationship context for this person."
    ),
  relationshipHint: z
    .string()
    .nullable()
    .describe(
      "How this person relates to others in the note (e.g. spouse of Pat Pease)"
    ),
  profileUpdates: z
    .record(z.string())
    .default({})
    .describe(
      "Profile field keys for THIS person only — firstName, spouseFirstName, maritalStatus, etc."
    ),
  sourceSnippets: z
    .record(z.string())
    .default({})
    .describe(
      "Verbatim quotes from the note supporting fields for this person (voice only)"
    ),
});

export const multiContactParseSchema = z.object({
  contacts: z
    .array(proposedPersonSchema)
    .describe(
      "Every distinct person mentioned with facts that belong to them. Create separate entries for spouses, children, colleagues, etc."
    ),
});

export type ProposedPersonParse = z.infer<typeof proposedPersonSchema>;
export type MultiContactParse = z.infer<typeof multiContactParseSchema>;
