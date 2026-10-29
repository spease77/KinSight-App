import { z } from "zod";
import { extractDebriefFromTranscript } from "@/lib/ai/extract-debrief";
import { buildRequestContext } from "@/lib/ai/request-context";
import {
  openAiTranscribeErrorMessage,
  transcribeAudioBuffer,
} from "@/lib/audio/transcribe-buffer";
import { lookupCalendarEventId } from "@/lib/calendar/lookup-event";
import { resolveContact } from "@/lib/services/contactResolver";
import { appendContactAlias } from "@/lib/supabase/contact-aliases";
import { appendContactNote } from "@/lib/supabase/contacts";
import {
  recordVoiceLog,
  type VoiceLogActionItem,
  type VoiceLogRecord,
} from "@/lib/supabase/voice-logs";
import { isLinkedContactId } from "@/types/scheduled-interaction";

export const maxDuration = 60;

const MIN_AUDIO_BYTES = 1000;

const actionItemsSchema = z.array(
  z.union([
    z.string(),
    z.object({ text: z.string(), done: z.boolean().optional() }),
  ])
);

function parseActionItems(raw: string | null): VoiceLogActionItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = actionItemsSchema.parse(JSON.parse(raw));
    return parsed
      .map((item) => (typeof item === "string" ? { text: item.trim() } : item))
      .filter((item) => item.text);
  } catch {
    return [];
  }
}

function formatDebriefNote(
  summary: string,
  transcript: string,
  actionItems: VoiceLogActionItem[]
): string {
  const lines = ["Debrief"];
  if (summary.trim()) lines.push(summary.trim());
  if (actionItems.length > 0) {
    lines.push("", "Action items:");
    for (const item of actionItems) {
      lines.push(`- ${item.text}`);
    }
  }
  if (transcript.trim()) {
    lines.push("", transcript.trim());
  }
  return lines.join("\n");
}

async function resolveDebriefContact(input: {
  contactId?: string | null;
  mentionedNames: string[];
  eventTitle?: string | null;
}): Promise<{
  contact_id: string | null;
  needs_confirmation: boolean;
  spoken_name?: string;
  candidates: Array<{
    contactId: string;
    name: string;
    company: string;
    role: string;
    confidence: number;
  }>;
}> {
  if (input.contactId && isLinkedContactId(input.contactId)) {
    return {
      contact_id: input.contactId,
      needs_confirmation: false,
      candidates: [],
    };
  }

  const names = input.mentionedNames.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) {
    return { contact_id: null, needs_confirmation: false, candidates: [] };
  }

  let bestAmbiguous: Awaited<ReturnType<typeof resolveContact>> | null = null;

  for (const name of names) {
    const resolved = await resolveContact({
      name,
      eventTitle: input.eventTitle ?? undefined,
    });
    if (resolved.contact_id && !resolved.needs_confirmation) {
      return {
        contact_id: resolved.contact_id,
        needs_confirmation: false,
        spoken_name: name,
        candidates: resolved.candidates,
      };
    }
    if (
      resolved.needs_confirmation &&
      resolved.candidates.length > 0 &&
      (!bestAmbiguous ||
        resolved.candidates.length > bestAmbiguous.candidates.length)
    ) {
      bestAmbiguous = resolved;
    }
  }

  if (bestAmbiguous) {
    return {
      contact_id: null,
      needs_confirmation: true,
      spoken_name: bestAmbiguous.spoken_name ?? names[0],
      candidates: bestAmbiguous.candidates,
    };
  }

  return {
    contact_id: null,
    needs_confirmation: false,
    spoken_name: names[0],
    candidates: [],
  };
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is missing from .env.local" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const audio = formData.get("audio");
    const providedTranscript = String(formData.get("transcript") ?? "").trim();
    const providedSummary = String(formData.get("ai_summary") ?? "").trim();
    const contactIdInput = String(formData.get("contact_id") ?? "").trim();
    const calendarEventIdInput = String(
      formData.get("calendar_event_id") ?? ""
    ).trim();
    const externalEventId = String(
      formData.get("external_event_id") ?? ""
    ).trim();
    const provider = String(formData.get("provider") ?? "").trim();
    const eventTitle = String(formData.get("event_title") ?? "").trim();
    const spokenNameInput = String(formData.get("spoken_name") ?? "").trim();

    let transcript = providedTranscript;
    let aiSummary = providedSummary;
    let actionItems = parseActionItems(
      String(formData.get("action_items") ?? "")
    );
    let mentionedNames = String(formData.get("mentioned_names") ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    if (audio && typeof audio !== "string") {
      const mimeType = ("type" in audio && audio.type) || "audio/webm";
      const buffer = Buffer.from(await audio.arrayBuffer());
      if (buffer.byteLength < MIN_AUDIO_BYTES) {
        return Response.json(
          {
            error:
              "Recording too short or empty. Speak for at least 2–3 seconds, then tap Stop & Process.",
          },
          { status: 400 }
        );
      }

      transcript = (
        await transcribeAudioBuffer(buffer, mimeType, { model: "whisper-1" })
      ).trim();
      if (!transcript) {
        return Response.json(
          { error: "Could not hear any speech. Try recording again." },
          { status: 400 }
        );
      }

      const extracted = await extractDebriefFromTranscript(
        transcript,
        buildRequestContext("voice"),
        eventTitle || undefined
      );
      aiSummary = extracted.ai_summary;
      actionItems = extracted.action_items;
      mentionedNames = extracted.mentioned_names;
    } else if (!transcript) {
      return Response.json(
        { error: "Audio or transcript is required." },
        { status: 400 }
      );
    }

    const calendarEventId = await lookupCalendarEventId({
      calendarEventId: calendarEventIdInput,
      externalEventId,
      provider,
    });

    const resolved = await resolveDebriefContact({
      contactId: contactIdInput,
      mentionedNames,
      eventTitle,
    });

    if (resolved.needs_confirmation) {
      return Response.json({
        needs_confirmation: true,
        spoken_name: resolved.spoken_name ?? mentionedNames[0] ?? "",
        candidates: resolved.candidates,
        transcript,
        ai_summary: aiSummary,
        action_items: actionItems,
        mentioned_names: mentionedNames,
        calendar_event_id: calendarEventId,
      });
    }

    if (!resolved.contact_id) {
      return Response.json(
        {
          error:
            "Could not match this debrief to a contact. Name the person, or record from their profile.",
          transcript,
          ai_summary: aiSummary,
          action_items: actionItems,
          mentioned_names: mentionedNames,
        },
        { status: 422 }
      );
    }

    const spokenName = spokenNameInput || resolved.spoken_name;
    if (spokenName) {
      await appendContactAlias(resolved.contact_id, spokenName);
    }

    const saved = await recordVoiceLog({
      contactId: resolved.contact_id,
      calendarEventId,
      transcript,
      aiSummary,
      actionItems,
    });

    if (saved.error || !saved.voice_log) {
      return Response.json(
        { error: saved.error ?? "Could not save the voice log." },
        { status: 500 }
      );
    }

    await appendContactNote(
      resolved.contact_id,
      formatDebriefNote(aiSummary, transcript, actionItems),
      undefined,
      { skipVoiceLog: true }
    );

    return Response.json({
      voice_log: saved.voice_log as VoiceLogRecord,
      contact_id: resolved.contact_id,
    });
  } catch (err) {
    console.error("audio transcribe error:", err);
    return Response.json(
      { error: openAiTranscribeErrorMessage(err) },
      { status: 500 }
    );
  }
}
