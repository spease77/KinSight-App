import { z } from "zod";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { MODELS } from "@/lib/ai/models";
import {
  mergeIntelligenceProfile,
  parsePreMeetingCard,
  type IntelligenceProfile,
  type PreMeetingCard,
} from "@/lib/contacts/intelligence-profile";
import { lookupCalendarEventId } from "@/lib/calendar/lookup-event";
import { readCompanyNewsCache } from "@/lib/supabase/company-news";
import { readIntelligenceProfile } from "@/lib/supabase/intelligence-profile";
import { createServerSupabase } from "@/lib/supabase/server";
import { listVoiceLogsForContact } from "@/lib/supabase/voice-logs";
import { isLinkedContactId } from "@/types/scheduled-interaction";

const ADVISOR_SYSTEM = `You are an elite executive sales coach and relationship strategist. Generate 2 concise questions, 1 key read on their current state, 1 warning flag, and 1 natural opening move. DO NOT reference frameworks like R.I.C.E., Voss, or Klaff by name. Output strictly natural, direct, highly conversational guidance.`;

const briefingSchema = z.object({
  summary: z.string(),
  top_questions: z.array(z.string()).min(1).max(2),
  caution_flags: z.array(z.string()).min(1).max(2),
  opening_move: z.string(),
});

function formatProfile(profile: IntelligenceProfile | null): string {
  if (!profile) return "No intelligence profile yet.";
  const lines = [
    `Communication style: ${profile.communication_style ?? "unknown"}`,
    `Primary driver: ${profile.primary_driver ?? "unknown"}`,
    `Relationship: ${profile.relationship_velocity}`,
    profile.last_interaction_date
      ? `Last interaction: ${profile.last_interaction_date}`
      : "Last interaction: unknown",
  ];
  if (profile.personal_context.length > 0) {
    lines.push(`Personal context: ${profile.personal_context.join("; ")}`);
  }
  if (profile.objections_and_fears.length > 0) {
    lines.push(`Watch-outs: ${profile.objections_and_fears.join("; ")}`);
  }
  return lines.join("\n");
}

async function writePreMeetingCard(
  eventId: string,
  card: PreMeetingCard
): Promise<void> {
  try {
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from("calendar_events")
      .update({
        pre_meeting_card: card,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", eventId);

    if (error) {
      console.error("writePreMeetingCard error:", error.message);
    }
  } catch (err) {
    console.error("writePreMeetingCard error:", err);
  }
}

async function readStoredPreMeetingCard(
  eventId: string
): Promise<PreMeetingCard | null> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("calendar_events")
      .select("pre_meeting_card")
      .eq("id", eventId)
      .maybeSingle();
    if (error || !data) return null;
    return parsePreMeetingCard(
      (data as { pre_meeting_card?: unknown }).pre_meeting_card
    );
  } catch {
    return null;
  }
}

function isFreshCard(card: PreMeetingCard): boolean {
  const generated = Date.parse(card.generated_at);
  if (!Number.isFinite(generated)) return false;
  return Date.now() - generated < 12 * 60 * 60 * 1000;
}

export async function generatePreMeetingBriefing(input: {
  eventId?: string | null;
  contactId: string;
  externalEventId?: string | null;
  provider?: string | null;
}): Promise<PreMeetingCard | null> {
  const contactId = input.contactId.trim();
  if (!isLinkedContactId(contactId)) return null;

  const calendarEventId = await lookupCalendarEventId({
    calendarEventId: input.eventId,
    externalEventId: input.externalEventId,
    provider: input.provider,
  });

  if (calendarEventId) {
    const stored = await readStoredPreMeetingCard(calendarEventId);
    if (stored && isFreshCard(stored)) return stored;
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) return null;

  const loaded = await readIntelligenceProfile(contactId);
  if (!loaded) return null;

  const profile =
    loaded.profile ??
    mergeIntelligenceProfile(null, {
      last_interaction_date: loaded.lastContact,
    });

  const [logs, news] = await Promise.all([
    listVoiceLogsForContact(contactId, 8),
    readCompanyNewsCache(contactId),
  ]);

  const voiceBlock =
    logs.length === 0
      ? "No prior voice debriefs."
      : logs
          .map((log) => {
            const summary = log.ai_summary?.trim() || log.transcript.trim();
            return `- ${log.created_at}: ${summary.slice(0, 400)}`;
          })
          .join("\n");

  const newsBlock =
    news?.cache?.has_news
      ? `${news.cache.headline}\n${news.cache.summary}`
      : "No verified company news.";

  try {
    const { object } = await generateObject({
      model: anthropic(MODELS.advisor),
      schema: briefingSchema,
      schemaName: "PreMeetingCard",
      schemaDescription:
        "Natural pre-meeting guidance for one specific contact",
      system: ADVISOR_SYSTEM,
      prompt: `Contact: ${loaded.contactName}
Company: ${loaded.company || "unknown"}
Role: ${loaded.role || "unknown"}

Intelligence profile:
${formatProfile(profile)}

Recent voice debriefs:
${voiceBlock}

Company news:
${newsBlock}

Return:
- summary: 1-2 sentences on their current priorities
- top_questions: exactly 2 concise questions to ask
- caution_flags: 1 short warning about what not to do
- opening_move: one natural spoken opener`,
    });

    const card: PreMeetingCard = {
      summary: object.summary.trim(),
      top_questions: object.top_questions.map((item) => item.trim()).filter(Boolean).slice(0, 2),
      caution_flags: object.caution_flags.map((item) => item.trim()).filter(Boolean).slice(0, 2),
      opening_move: object.opening_move.trim(),
      generated_at: new Date().toISOString(),
    };

    if (!card.summary || !card.opening_move || card.top_questions.length === 0) {
      return null;
    }

    if (calendarEventId) {
      void writePreMeetingCard(calendarEventId, card);
    }

    return card;
  } catch (err) {
    console.error("generatePreMeetingBriefing error:", err);
    return null;
  }
}
