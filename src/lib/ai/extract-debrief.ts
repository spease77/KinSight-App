import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { MODELS } from "@/lib/ai/models";
import {
  buildRequestContext,
  type AiRequestContext,
} from "@/lib/ai/request-context";
import { buildSharedModelInstructions } from "@/lib/ai/shared-model-instructions";
import type { VoiceLogActionItem } from "@/lib/supabase/voice-logs";

const debriefSchema = z.object({
  ai_summary: z.string(),
  action_items: z.array(z.string()).default([]),
  mentioned_names: z.array(z.string()).default([]),
});

export type ExtractedDebrief = {
  ai_summary: string;
  action_items: VoiceLogActionItem[];
  mentioned_names: string[];
};

export async function extractDebriefFromTranscript(
  transcript: string,
  requestContext: AiRequestContext = buildRequestContext("voice"),
  eventTitle?: string
): Promise<ExtractedDebrief> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return { ai_summary: "", action_items: [], mentioned_names: [] };
  }

  try {
    const { object } = await generateObject({
      model: openai(MODELS.parse),
      schema: debriefSchema,
      schemaName: "VoiceDebrief",
      schemaDescription:
        "Summary, follow-ups, and spoken names from a meeting debrief",
      prompt: `${buildSharedModelInstructions(requestContext)}

Extract a concise debrief from this voice note.
${eventTitle?.trim() ? `Calendar event title: ${eventTitle.trim()}` : ""}

Return:
- ai_summary: 1–3 sentences of key takeaways. No fluff.
- action_items: follow-ups or tasks as short imperative phrases. Empty if none.
- mentioned_names: people or companies spoken by name (first name is enough). Do not invent names.

Transcript:
"""
${trimmed}
"""`,
    });

    return {
      ai_summary: object.ai_summary.trim(),
      action_items: object.action_items
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({ text })),
      mentioned_names: object.mentioned_names
        .map((name) => name.trim())
        .filter(Boolean),
    };
  } catch (err) {
    console.error("extractDebriefFromTranscript failed:", err);
    const firstLine =
      trimmed.split(/\n+/).find((line) => line.trim()) ?? trimmed;
    return {
      ai_summary:
        firstLine.length > 240 ? `${firstLine.slice(0, 237).trim()}…` : firstLine,
      action_items: [],
      mentioned_names: [],
    };
  }
}
