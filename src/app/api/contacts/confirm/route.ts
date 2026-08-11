import { z } from "zod";
import type { ParsedProposedPerson } from "@/lib/ai/parse-multi-contact";
import {
  buildRequestContext,
  type AiRequestContext,
} from "@/lib/ai/request-context";
import {
  createContactFromProposed,
  updateContactFromProposed,
} from "@/lib/supabase/contacts";

const proposedPersonSchema = z.object({
  displayName: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  nickname: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  notes: z.string().optional(),
  lastContact: z.string().optional(),
  lastMeetingDate: z.string().optional(),
  nextSteps: z.string().optional(),
  topics: z.array(z.string()).optional(),
  relationshipHint: z.string().optional(),
  profile: z.record(z.string()).default({}),
  sourceSnippets: z.record(z.string()).default({}),
});

const confirmSchema = z.object({
  action: z.enum(["create", "update"]),
  person: proposedPersonSchema,
  transcript: z.string().min(1),
  recordingId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  requestContext: z
    .object({
      current_timestamp: z.string(),
      day_of_week: z.string(),
      entry_method: z.enum(["voice", "manual"]),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const {
      action,
      person,
      transcript,
      recordingId,
      contactId,
      requestContext: ctxInput,
    } = parsed.data;

    const requestContext: AiRequestContext =
      ctxInput ?? buildRequestContext(recordingId ? "voice" : "manual");

    const personPayload = person as ParsedProposedPerson;

    if (action === "update") {
      if (!contactId) {
        return Response.json(
          { error: "contactId is required for updates" },
          { status: 400 }
        );
      }

      const { contact, error } = await updateContactFromProposed(
        contactId,
        personPayload,
        transcript,
        recordingId,
        requestContext
      );

      if (error || !contact) {
        return Response.json(
          { error: error ?? "Could not update contact" },
          { status: 500 }
        );
      }

      return Response.json({ contact, action: "update" });
    }

    const { contact, error } = await createContactFromProposed(
      personPayload,
      transcript,
      recordingId,
      requestContext
    );

    if (error || !contact) {
      return Response.json(
        { error: error ?? "Could not create contact" },
        { status: 500 }
      );
    }

    return Response.json({ contact, action: "create" }, { status: 201 });
  } catch (err) {
    console.error("confirm contact error:", err);
    return Response.json(
      { error: "Could not save contact. Please try again." },
      { status: 500 }
    );
  }
}
