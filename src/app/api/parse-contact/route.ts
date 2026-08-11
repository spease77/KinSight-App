import { parseTranscriptWithSources } from "@/lib/ai/parse-transcript";
import {
  buildRequestContext,
  type EntryMethod,
} from "@/lib/ai/request-context";
import { createContactFromVoice } from "@/lib/supabase/contacts";

export const maxDuration = 30;

/** Legacy direct-parse endpoint. Prefer /api/agent for conversational flow. */
export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is missing from .env.local" },
      { status: 500 }
    );
  }

  const { transcript, recordingId, entry_method, current_timestamp, day_of_week } =
    (await req.json()) as {
      transcript?: string;
      recordingId?: string;
      entry_method?: EntryMethod;
      current_timestamp?: string;
      day_of_week?: string;
    };

  if (!transcript?.trim()) {
    return Response.json({ error: "Transcript is required" }, { status: 400 });
  }

  try {
    const method = entry_method ?? (recordingId ? "voice" : "manual");
    const requestContext =
      current_timestamp && day_of_week
        ? {
            current_timestamp,
            day_of_week,
            entry_method: method,
          }
        : buildRequestContext(method);

    const sourced = await parseTranscriptWithSources(transcript, requestContext);
    const { contact, error: saveError } = await createContactFromVoice(
      transcript.trim(),
      undefined,
      recordingId,
      requestContext
    );

    if (saveError) {
      return Response.json({
        parsed: sourced.fields,
        profile: sourced.profile,
        sourceSnippets: sourced.sourceSnippets,
        contact: null,
        warning: `Parsed successfully but could not save to Supabase: ${saveError}`,
      });
    }

    return Response.json({
      parsed: sourced.fields,
      profile: sourced.profile,
      sourceSnippets: sourced.sourceSnippets,
      contact,
    });
  } catch (err) {
    console.error("Contact parse error:", err);
    return Response.json(
      { error: "Failed to parse inquiry into contact fields." },
      { status: 500 }
    );
  }
}
