import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { MODELS } from "@/lib/ai/models";
import {
  mergeAliasLists,
  readProfileAliases,
  seedAliasesFromName,
  writeProfileAliases,
} from "@/lib/contacts/contact-aliases";
import {
  emailsFromProfileFields,
  pickResolvedMatch,
  rankContactMatches,
  type ContactMatchBasis,
  type ContactResolutionRecord,
  type ResolveContactQuery,
  type ScoredContactMatch,
} from "@/lib/contacts/contact-resolution";
import { readLabeledEmails } from "@/lib/contacts/labeled-contact-fields";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ContactProfile } from "@/types/contact-profile";
import { sanitizeContactProfile } from "@/types/contact-profile";

export type { ContactResolutionRecord, ResolveContactQuery };

export type ResolveContactInput = ResolveContactQuery;

export type ResolveContactCandidate = {
  contactId: string;
  name: string;
  company: string;
  role: string;
  matchedOn: ContactMatchBasis;
  confidence: number;
};

export type ResolveContactResult = {
  contact_id: string | null;
  confidence_score: number;
  needs_confirmation: boolean;
  matched_on?: ContactMatchBasis;
  candidates: ResolveContactCandidate[];
  spoken_name?: string;
};

type ContactLookupRow = {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  email?: string | null;
  aliases?: string[] | null;
  profile?: Record<string, string> | null;
};

const llmMatchSchema = z.object({
  contact_id: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

function isMissingColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    (lower.includes("could not find") && lower.includes("column"))
  );
}

function toRecord(row: ContactLookupRow): ContactResolutionRecord {
  const profile = sanitizeContactProfile(row.profile ?? {});
  const labeled = readLabeledEmails(profile).map((entry) => entry.value);
  const emails = mergeAliasLists(
    [row.email],
    emailsFromProfileFields(profile),
    labeled
  ).filter((value) => value.includes("@"));

  return {
    id: row.id,
    name: row.name,
    company: row.company ?? "",
    role: row.role ?? "",
    emails,
    aliases: mergeAliasLists(
      row.aliases,
      readProfileAliases(profile),
      seedAliasesFromName(row.name)
    ),
  };
}

export async function loadContactResolutionRecords(): Promise<
  ContactResolutionRecord[]
> {
  const supabase = createServerSupabase();
  const full = await supabase
    .from("contacts")
    .select("id, name, company, role, email, aliases, profile");

  if (!full.error) {
    return ((full.data ?? []) as ContactLookupRow[]).map(toRecord);
  }

  if (!isMissingColumnError(full.error.message)) {
    console.error("loadContactResolutionRecords:", full.error.message);
    return [];
  }

  const fallback = await supabase
    .from("contacts")
    .select("id, name, company, role, profile");

  if (fallback.error) {
    console.error("loadContactResolutionRecords fallback:", fallback.error.message);
    return [];
  }

  return ((fallback.data ?? []) as ContactLookupRow[]).map(toRecord);
}

function toResult(
  pick: ReturnType<typeof pickResolvedMatch>,
  spokenName?: string
): ResolveContactResult {
  const match = pick.match;
  return {
    contact_id: match?.contactId ?? null,
    confidence_score: match?.confidence ?? pick.candidates[0]?.confidence ?? 0,
    needs_confirmation: pick.needsConfirmation,
    matched_on: match?.matchedOn,
    candidates: pick.candidates,
    spoken_name: spokenName?.trim() || undefined,
  };
}

async function resolveWithLlm(
  query: ResolveContactInput,
  candidates: ScoredContactMatch[]
): Promise<ResolveContactResult | null> {
  if (candidates.length < 2 || !process.env.OPENAI_API_KEY) return null;

  try {
    const { object } = await generateObject({
      model: openai(MODELS.parse),
      schema: llmMatchSchema,
      schemaName: "ContactResolution",
      schemaDescription:
        "Pick the KinSight contact that matches the spoken or calendar name",
      prompt: `You match a mentioned person to saved KinSight contacts.

Query:
- name: ${query.name?.trim() || "(none)"}
- email: ${query.email?.trim() || "(none)"}
- company context: ${query.contextCompany?.trim() || "(none)"}
- event title: ${query.eventTitle?.trim() || "(none)"}

Candidates:
${candidates
  .map(
    (item, index) =>
      `${index + 1}. id=${item.contactId} name=${item.name} company=${item.company || "(none)"} role=${item.role || "(none)"} score=${item.confidence}`
  )
  .join("\n")}

Rules:
1. Return a candidate contact_id only when the context makes that person clearly the intended match.
2. confidence must be 0-1. Use >= 0.85 only when you are sure.
3. If two people could both be right (e.g. two contacts named Pat), return contact_id null and confidence below 0.85.
4. Never invent an id that is not in the candidate list.`,
    });

    const chosen = candidates.find((item) => item.contactId === object.contact_id);
    if (!chosen || object.confidence < 0.85) {
      return {
        contact_id: null,
        confidence_score: object.confidence,
        needs_confirmation: true,
        candidates,
        spoken_name: query.name?.trim() || undefined,
      };
    }

    return {
      contact_id: chosen.contactId,
      confidence_score: Math.max(chosen.confidence, object.confidence),
      needs_confirmation: false,
      matched_on: "llm",
      candidates,
      spoken_name: query.name?.trim() || undefined,
    };
  } catch (err) {
    console.warn(
      "resolveContact LLM pass skipped:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export function resolveContactFromRecords(
  input: ResolveContactInput,
  records: ContactResolutionRecord[]
): ResolveContactResult {
  const query: ResolveContactInput = {
    name: input.name?.trim() || undefined,
    email: input.email?.trim() || undefined,
    contextCompany: input.contextCompany?.trim() || undefined,
    eventTitle: input.eventTitle?.trim() || undefined,
  };

  if (!query.name && !query.email) {
    return {
      contact_id: null,
      confidence_score: 0,
      needs_confirmation: false,
      candidates: [],
    };
  }

  const ranked = rankContactMatches(query, records);
  const pick = pickResolvedMatch(ranked);
  return toResult(pick, query.name);
}

export async function resolveContact(
  input: ResolveContactInput,
  options?: {
    records?: ContactResolutionRecord[];
    allowLlm?: boolean;
  }
): Promise<ResolveContactResult> {
  const records = options?.records ?? (await loadContactResolutionRecords());
  const allowLlm = options?.allowLlm !== false;
  const deterministic = resolveContactFromRecords(input, records);

  if (!deterministic.needs_confirmation || !allowLlm) {
    return deterministic;
  }

  const llm = await resolveWithLlm(input, deterministic.candidates);
  return llm ?? deterministic;
}

export function profileWithAliases(
  profile: ContactProfile,
  aliases: string[]
): ContactProfile {
  return writeProfileAliases(profile, aliases);
}
