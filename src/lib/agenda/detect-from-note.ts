import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { MODELS } from "@/lib/ai/models";
import type { AiRequestContext } from "@/lib/ai/request-context";
import { buildSharedModelInstructions } from "@/lib/ai/shared-model-instructions";
import { resolveContactByName } from "@/lib/contacts/resolve-contact-by-name";
import { fetchContacts } from "@/lib/supabase/contacts";

const agendaDetectionSchema = z.object({
  items: z
    .array(
      z.object({
        contact_name: z.string(),
        reminder_text: z.string(),
        scheduled_at: z.string(),
      })
    )
    .default([]),
});

export type DetectedAgendaItem = {
  contactId: string;
  contactName: string;
  reminderText: string;
  scheduledAt: string;
};

export async function detectAgendaFromNote(
  transcript: string,
  requestContext: AiRequestContext
): Promise<DetectedAgendaItem[]> {
  const { object } = await generateObject({
    model: openai(MODELS.parse),
    schema: agendaDetectionSchema,
    schemaName: "AgendaReminders",
    schemaDescription:
      "Scheduled reminders or follow-up meetings mentioned in a KinSight conversation",
    prompt: `${buildSharedModelInstructions(requestContext)}

Extract reminders or scheduled follow-ups that should appear on the user's Agenda.

RULES:
1. Only include items the assistant committed to scheduling or the user explicitly asked to schedule.
2. Resolve relative dates ("tomorrow at 10am", "next Tuesday") using current_timestamp into ISO 8601 scheduled_at values.
3. contact_name must match a person named in the text.
4. reminder_text should be a short actionable label (e.g. "Contact Denisse Pease").
5. Return an empty items array when no schedulable reminder is present.

Conversation:
"""
${transcript.trim()}
"""`,
    providerOptions: {
      openai: {
        strictJsonSchema: true,
      },
    },
  });

  const { contacts } = await fetchContacts();
  const results: DetectedAgendaItem[] = [];

  for (const item of object.items) {
    const contactName = item.contact_name.trim();
    if (!contactName) continue;

    const scheduledAt = item.scheduled_at.trim();
    if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) continue;

    const { contact } = resolveContactByName(contactName, contacts);
    if (!contact) continue;

    results.push({
      contactId: contact.id,
      contactName: contact.name,
      reminderText: item.reminder_text.trim() || `Contact ${contact.name}`,
      scheduledAt,
    });
  }

  return results;
}
