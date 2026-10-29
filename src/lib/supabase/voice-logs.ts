import { createServerSupabase } from "@/lib/supabase/server";

export type VoiceLogActionItem = {
  text: string;
  done?: boolean;
};

export type RecordVoiceLogInput = {
  contactId: string;
  transcript: string;
  calendarEventId?: string | null;
  aiSummary?: string | null;
  actionItems?: VoiceLogActionItem[];
};

function isMissingRelationError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("voice_logs") &&
    (lower.includes("does not exist") ||
      lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("relation"))
  );
}

function summarizeTranscript(transcript: string): string | null {
  const trimmed = transcript.trim();
  if (!trimmed) return null;
  const firstLine = trimmed.split(/\n+/).find((line) => line.trim()) ?? trimmed;
  return firstLine.length > 240 ? `${firstLine.slice(0, 237).trim()}…` : firstLine;
}

export async function recordVoiceLog(
  input: RecordVoiceLogInput
): Promise<{ id?: string; error?: string }> {
  const transcript = input.transcript.trim();
  const contactId = input.contactId.trim();
  if (!contactId || !transcript) return {};

  try {
    const supabase = createServerSupabase();
    const row = {
      contact_id: contactId,
      calendar_event_id: input.calendarEventId?.trim() || null,
      transcript,
      ai_summary: input.aiSummary?.trim() || summarizeTranscript(transcript),
      action_items: input.actionItems ?? [],
    };

    const { data, error } = await supabase
      .from("voice_logs")
      .insert(row as never)
      .select("id")
      .single();

    if (error) {
      if (isMissingRelationError(error.message)) {
        console.warn(
          "[voice-logs] Table missing — run supabase/migrations/024_contact_resolution.sql."
        );
        return {};
      }
      console.error("[voice-logs] Could not insert:", error.message);
      return { error: error.message };
    }

    return { id: (data as { id?: string } | null)?.id };
  } catch (err) {
    console.error("[voice-logs] Could not insert:", err);
    return {
      error: err instanceof Error ? err.message : "Could not save voice log",
    };
  }
}
