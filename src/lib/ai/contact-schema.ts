import { z } from "zod";

export const contactParseSchema = z.object({
  name: z
    .string()
    .nullable()
    .describe("Full name of the contact, or null if not mentioned"),
  company: z
    .string()
    .nullable()
    .describe("Company or organization, or null if not mentioned"),
  role: z
    .string()
    .nullable()
    .describe("Job title or role, or null if not mentioned"),
  notes: z
    .string()
    .nullable()
    .describe("Relationship context, preferences, or history mentioned"),
  last_contact: z
    .string()
    .nullable()
    .describe(
      "Optional free-text mention of last contact timing (e.g. 'yesterday'). Prefer last_meeting_date for resolved dates."
    ),
  last_meeting_date: z
    .string()
    .nullable()
    .describe(
      "Resolved calendar date of last meeting/contact as MM-DD-YYYY. Compute from relative phrases using current_timestamp in context (e.g. 'yesterday' → 06-03-2026 when today is June 4, 2026)."
    ),
  next_steps: z
    .string()
    .nullable()
    .describe("Agreed or implied follow-up actions"),
  topics: z
    .array(z.string())
    .nullable()
    .describe("Topics discussed or to discuss in upcoming meeting"),
  contact_type: z
    .enum(["professional", "personal", "family"])
    .nullable()
    .describe(
      "Relationship category: professional (work/client), personal (social friend), family (relative). Null when ambiguous."
    ),
  contact_type_needs_confirmation: z
    .boolean()
    .default(false)
    .describe(
      "True when the note only gives a name with no relationship context — user must confirm contact type."
    ),
});

export type ParsedContactFields = z.infer<typeof contactParseSchema>;
