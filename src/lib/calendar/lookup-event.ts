import { createServerSupabase } from "@/lib/supabase/server";
import { isLinkedContactId } from "@/types/scheduled-interaction";

export async function lookupCalendarEventId(input: {
  calendarEventId?: string | null;
  externalEventId?: string | null;
  provider?: string | null;
}): Promise<string | null> {
  try {
    const supabase = createServerSupabase();
    const direct = input.calendarEventId?.trim();
    if (direct && isLinkedContactId(direct)) {
      const byId = await supabase
        .from("calendar_events")
        .select("id")
        .eq("id", direct)
        .maybeSingle();
      const byIdRow = byId.data as { id?: string } | null;
      if (!byId.error && byIdRow?.id) return byIdRow.id;

      const byInteraction = await supabase
        .from("calendar_events")
        .select("id")
        .eq("scheduled_interaction_id", direct)
        .maybeSingle();
      const byInteractionRow = byInteraction.data as { id?: string } | null;
      if (!byInteraction.error && byInteractionRow?.id) {
        return byInteractionRow.id;
      }
    }

    const externalEventId = input.externalEventId?.trim();
    const provider = input.provider?.trim();
    if (!externalEventId || !provider) return null;

    const { data, error } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("provider", provider)
      .eq("external_event_id", externalEventId)
      .maybeSingle();

    if (error || !data) return null;
    return (data as { id?: string }).id ?? null;
  } catch {
    return null;
  }
}
