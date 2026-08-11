import {
  buildRequestContext,
  resolveAgentRequestContext,
  type AiRequestContext,
  type EntryMethod,
} from "@/lib/ai/request-context";
import { detectAgendaFromNote } from "@/lib/agenda/detect-from-note";

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
      requestContext?: Partial<AiRequestContext>;
      entry_method?: EntryMethod;
    };

    const transcript = body.transcript?.trim();
    if (!transcript) {
      return Response.json({ error: "Transcript is required" }, { status: 400 });
    }

    const requestContext = body.requestContext
      ? resolveAgentRequestContext([], body.requestContext)
      : buildRequestContext(body.entry_method ?? "manual");

    const items = await detectAgendaFromNote(transcript, requestContext);

    return Response.json({
      items,
      requestContext,
    });
  } catch (err) {
    console.error("detect-agenda error:", err);
    return Response.json({
      items: [],
      requestContext: buildRequestContext("manual"),
    });
  }
}
