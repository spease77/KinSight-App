import {
  buildRequestContext,
  resolveAgentRequestContext,
  type AiRequestContext,
  type EntryMethod,
} from "@/lib/ai/request-context";
import { detectContactsFromNote } from "@/lib/contacts/detect-from-note";

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is missing from .env.local" },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as {
      transcript?: string;
      recordingId?: string;
      entry_method?: EntryMethod;
      requestContext?: Partial<AiRequestContext>;
    };

    const transcript = body.transcript?.trim();
    if (!transcript) {
      return Response.json({ error: "Transcript is required" }, { status: 400 });
    }

    const requestContext = body.requestContext
      ? resolveAgentRequestContext([], body.requestContext)
      : buildRequestContext(
          body.entry_method ?? (body.recordingId ? "voice" : "manual")
        );

    const result = await detectContactsFromNote(transcript, requestContext);

    return Response.json({
      ...result,
      transcript,
      recordingId: body.recordingId ?? null,
      requestContext,
    });
  } catch (err) {
    console.error("detect-contacts error:", err);
    return Response.json({
      newContacts: [],
      existingUpdates: [],
      transcript: "",
      recordingId: null,
      requestContext: buildRequestContext("manual"),
    });
  }
}
