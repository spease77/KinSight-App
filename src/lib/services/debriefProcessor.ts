import { z } from "zod";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { MODELS } from "@/lib/ai/models";
import {
  COMMUNICATION_STYLES,
  mergeIntelligenceProfile,
  PRIMARY_DRIVERS,
  type CommunicationStyle,
  type IntelligenceProfile,
  type PrimaryDriver,
} from "@/lib/contacts/intelligence-profile";
import { upsertContactFacts } from "@/lib/contacts/contact-facts";
import { transcribeAudioBuffer } from "@/lib/audio/transcribe-buffer";
import { createAgendaItem } from "@/lib/supabase/scheduled-interactions";
import {
  readIntelligenceProfile,
  writeIntelligenceProfile,
} from "@/lib/supabase/intelligence-profile";
import { getContactRowById } from "@/lib/supabase/contacts";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  getVoiceLogById,
  updateVoiceLogTranscript,
  type VoiceLogRecord,
} from "@/lib/supabase/voice-logs";

const debriefIntelSchema = z.object({
  communication_style: z.enum(COMMUNICATION_STYLES).nullable(),
  primary_driver: z.enum(PRIMARY_DRIVERS).nullable(),
  personal_context: z.array(z.string()).default([]),
  objections_and_fears: z.array(z.string()).default([]),
  mentioned_contacts: z.array(z.string()).default([]),
  follow_up_tasks: z
    .array(
      z.object({
        title: z.string(),
        due_at: z.string().nullable().optional(),
      })
    )
    .default([]),
});

export type AdvisorTaskDraft = {
  title: string;
  due_at: string | null;
};

export type ProcessedVoiceDebrief = {
  intelligence_profile: IntelligenceProfile;
  mentioned_contacts: string[];
  follow_up_tasks: AdvisorTaskDraft[];
};

function cleanLines(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

async function insertAdvisorTask(input: {
  contactId: string;
  calendarEventId: string | null;
  voiceLogId: string;
  title: string;
  dueAt: string | null;
}): Promise<void> {
  try {
    const supabase = createServerSupabase();
    const { error } = await supabase.from("advisor_tasks").insert({
      contact_id: input.contactId,
      calendar_event_id: input.calendarEventId,
      voice_log_id: input.voiceLogId,
      title: input.title,
      due_at: input.dueAt,
      status: "pending",
    } as never);

    if (error) {
      console.error("insertAdvisorTask error:", error.message);
    }
  } catch (err) {
    console.error("insertAdvisorTask error:", err);
  }
}

async function persistFollowUps(input: {
  contactId: string;
  calendarEventId: string | null;
  voiceLogId: string;
  tasks: AdvisorTaskDraft[];
}): Promise<void> {
  for (const task of input.tasks) {
    const title = task.title.trim();
    if (!title) continue;
    const dueAt = task.due_at?.trim() || null;
    await insertAdvisorTask({
      contactId: input.contactId,
      calendarEventId: input.calendarEventId,
      voiceLogId: input.voiceLogId,
      title,
      dueAt,
    });

    if (dueAt && !Number.isNaN(Date.parse(dueAt))) {
      await createAgendaItem({
        contactId: input.contactId,
        scheduledAt: dueAt,
        title,
        notes: "Follow-up from meeting debrief",
      });
    }
  }
}

export async function processVoiceDebrief(input: {
  voiceLogId: string;
  audio?: { buffer: Buffer; mimeType: string };
}): Promise<ProcessedVoiceDebrief | null> {
  const voiceLogId = input.voiceLogId.trim();
  if (!voiceLogId) return null;

  const voiceLog: VoiceLogRecord | null = await getVoiceLogById(voiceLogId);
  if (!voiceLog) return null;

  let transcript = voiceLog.transcript.trim();
  if (!transcript && input.audio) {
    transcript = (
      await transcribeAudioBuffer(input.audio.buffer, input.audio.mimeType, {
        model: "whisper-1",
      })
    ).trim();
    if (transcript) {
      await updateVoiceLogTranscript(voiceLogId, transcript);
    }
  }
  if (!transcript) return null;

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    const loaded = await readIntelligenceProfile(voiceLog.contact_id);
    const now = new Date().toISOString();
    const profile = mergeIntelligenceProfile(loaded?.profile ?? null, {
      last_interaction_date: now,
    });
    await writeIntelligenceProfile(voiceLog.contact_id, profile);
    return {
      intelligence_profile: profile,
      mentioned_contacts: [],
      follow_up_tasks: [],
    };
  }

  const loaded = await readIntelligenceProfile(voiceLog.contact_id);
  const existing = loaded?.profile ?? null;

  try {
    const { object } = await generateObject({
      model: anthropic(MODELS.advisor),
      schema: debriefIntelSchema,
      schemaName: "DebriefIntelligence",
      schemaDescription:
        "Updated relationship intelligence extracted from a meeting debrief",
      system: `You extract private relationship intelligence from a post-meeting voice debrief.
Return only facts clearly supported by the transcript.
Do not invent drivers, fears, or people.
Do not name sales frameworks.
personal_context: durable personal facts (family, hobbies, life events).
objections_and_fears: business or personal pressures they voiced.
mentioned_contacts: other people named, with role if spoken (e.g. "VP Sarah").
follow_up_tasks: concrete next actions the user should take. due_at as ISO datetime if a time was stated, otherwise null.`,
      prompt: `Contact: ${loaded?.contactName ?? "unknown"}
Existing intelligence:
${JSON.stringify(existing ?? {})}

Transcript:
"""
${transcript}
"""`,
    });

    const now = new Date().toISOString();
    const personalContext = cleanLines(object.personal_context);
    const fears = cleanLines(object.objections_and_fears);
    const mentioned = cleanLines(object.mentioned_contacts);
    const followUps = object.follow_up_tasks
      .map((task) => ({
        title: task.title.trim(),
        due_at: task.due_at?.trim() || null,
      }))
      .filter((task) => task.title);

    const profile = mergeIntelligenceProfile(existing, {
      communication_style: object.communication_style as CommunicationStyle | null,
      primary_driver: object.primary_driver as PrimaryDriver | null,
      personal_context: [
        ...personalContext,
        ...mentioned.map((name) => `Mentioned ${name}`),
      ],
      objections_and_fears: fears,
      last_interaction_date: now,
    });

    await writeIntelligenceProfile(voiceLog.contact_id, profile);

    const row = await getContactRowById(voiceLog.contact_id);
    if (row?.profile && personalContext.length > 0) {
      const nextProfile = upsertContactFacts(row.profile, personalContext);
      const supabase = createServerSupabase();
      await supabase
        .from("contacts")
        .update({
          profile: nextProfile,
          last_meeting_date: now.slice(0, 10),
          last_contact: now,
          next_steps: row.next_steps?.trim() || followUps[0]?.title || row.next_steps,
        } as never)
        .eq("id", voiceLog.contact_id);
    } else {
      const supabase = createServerSupabase();
      await supabase
        .from("contacts")
        .update({
          last_meeting_date: now.slice(0, 10),
          last_contact: now,
          ...(followUps[0]?.title && !row?.next_steps?.trim()
            ? { next_steps: followUps[0].title }
            : {}),
        } as never)
        .eq("id", voiceLog.contact_id);
    }

    await persistFollowUps({
      contactId: voiceLog.contact_id,
      calendarEventId: voiceLog.calendar_event_id,
      voiceLogId,
      tasks: followUps,
    });

    return {
      intelligence_profile: profile,
      mentioned_contacts: mentioned,
      follow_up_tasks: followUps,
    };
  } catch (err) {
    console.error("processVoiceDebrief error:", err);
    const now = new Date().toISOString();
    const profile = mergeIntelligenceProfile(existing, {
      last_interaction_date: now,
    });
    await writeIntelligenceProfile(voiceLog.contact_id, profile);
    return {
      intelligence_profile: profile,
      mentioned_contacts: [],
      follow_up_tasks: [],
    };
  }
}
