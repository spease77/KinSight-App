import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { createAgentTools } from "@/lib/ai/agent-tools";
import { buildAgentSystemPrompt } from "@/lib/ai/agent-prompt";
import { AGENT_MAX_OUTPUT_TOKENS, MODELS } from "@/lib/ai/models";
import {
  resolveAgentRequestContext,
  type AiRequestContext,
} from "@/lib/ai/request-context";
import { extractLatestRecordingId } from "@/lib/agent/extract-recording-id";
import { checkDatabaseHealth, fetchContactsForExport } from "@/lib/supabase/contacts";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is missing from .env.local" },
      { status: 500 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is missing from .env.local" },
      { status: 500 }
    );
  }

  try {
    const {
      messages,
      requestContext,
    }: {
      messages: UIMessage[];
      requestContext?: Partial<AiRequestContext>;
    } = await req.json();

    const dbHealth = await checkDatabaseHealth();
    const { contacts } = await fetchContactsForExport();
    const recordingId = extractLatestRecordingId(messages);
    const context = resolveAgentRequestContext(messages, requestContext);

    const result = streamText({
      model: anthropic(MODELS.agent),
      system: buildAgentSystemPrompt(contacts, dbHealth, context),
      messages: await convertToModelMessages(messages),
      tools: createAgentTools({ recordingId, requestContext: context }),
      stopWhen: stepCountIs(8),
      maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("Agent route error:", err);

    const message =
      err instanceof Error
        ? err.message
        : "KinSight agent failed to respond.";

    return Response.json({ error: message }, { status: 500 });
  }
}
