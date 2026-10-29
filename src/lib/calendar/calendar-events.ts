import { createServerSupabase } from "@/lib/supabase/server";
import type { CalendarEventProvider } from "@/types/calendar-event";
import type { CalendarSyncStatus } from "@/types/calendar-event";

export type RememberExternalCalendarEventInput = {
  userId: string;
  interactionId: string;
  provider: Exclude<CalendarEventProvider, "kinsight">;
  externalEventId: string;
  calendarId?: string | null;
  isOrganizer?: boolean;
  isReadOnly?: boolean;
  syncStatus?: CalendarSyncStatus;
  contactId?: string | null;
  title?: string | null;
  startTime?: string | null;
};

export type RememberResolvedCalendarEventInput = {
  userId: string;
  provider: Exclude<CalendarEventProvider, "kinsight">;
  externalEventId: string;
  calendarId?: string | null;
  contactId?: string | null;
  title?: string | null;
  startTime?: string | null;
  isOrganizer?: boolean;
  isReadOnly?: boolean;
};

export async function rememberExternalCalendarEvent(
  input: RememberExternalCalendarEventInput
): Promise<void> {
  const lastSyncedAt = new Date().toISOString();
  const syncStatus = input.syncStatus ?? "synced";
  const isOrganizer = input.isOrganizer ?? true;
  const isReadOnly = input.isReadOnly ?? false;
  const calendarId = input.calendarId?.trim() || "primary";

  try {
    const supabase = createServerSupabase();
    const { data: current } = await supabase
      .from("scheduled_interactions")
      .select("external_event_id")
      .eq("id", input.interactionId)
      .maybeSingle();
    const existingExternalId = (
      current as { external_event_id?: string | null } | null
    )?.external_event_id?.trim();
    const keepExistingExternalId =
      Boolean(existingExternalId) &&
      existingExternalId !== input.externalEventId;

    const { error: interactionError } = await supabase
      .from("scheduled_interactions")
      .update({
        ...(keepExistingExternalId
          ? {}
          : {
              external_event_id: input.externalEventId,
              calendar_id: calendarId,
            }),
        is_organizer: isOrganizer,
        is_read_only: isReadOnly,
        sync_status: syncStatus,
        last_synced_at: lastSyncedAt,
      } as never)
      .eq("id", input.interactionId);

    if (interactionError) {
      console.error(
        "[calendar-sync] Could not store event id on scheduled_interactions:",
        interactionError.message
      );
    }

    const { data: existing, error: lookupError } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("user_id", input.userId)
      .eq("provider", input.provider)
      .eq("scheduled_interaction_id", input.interactionId)
      .maybeSingle();

    if (lookupError) {
      if (isCalendarEventsTableMissing(lookupError.message)) {
        console.warn(
          "[calendar-sync] calendar_events table missing — run migration 021_calendar_events_sync.sql."
        );
        return;
      }
      console.error(
        "[calendar-sync] Could not look up calendar_events:",
        lookupError.message
      );
      return;
    }

    const row = {
      user_id: input.userId,
      scheduled_interaction_id: input.interactionId,
      provider: input.provider,
      external_event_id: input.externalEventId,
      calendar_id: calendarId,
      is_organizer: isOrganizer,
      is_read_only: isReadOnly,
      sync_status: syncStatus,
      last_synced_at: lastSyncedAt,
      updated_at: lastSyncedAt,
      ...(input.contactId ? { contact_id: input.contactId } : {}),
      ...(input.title?.trim() ? { title: input.title.trim() } : {}),
      ...(input.startTime ? { start_time: input.startTime } : {}),
    };

    if (existing && (existing as { id?: string }).id) {
      const { error } = await supabase
        .from("calendar_events")
        .update(row as never)
        .eq("id", (existing as { id: string }).id);
      if (error) {
        console.error(
          "[calendar-sync] Could not update calendar_events:",
          error.message
        );
      }
      return;
    }

    const { error } = await supabase
      .from("calendar_events")
      .insert({ ...row, created_at: lastSyncedAt } as never);
    if (error) {
      console.error(
        "[calendar-sync] Could not insert calendar_events:",
        error.message
      );
    }
  } catch (err) {
    console.error("[calendar-sync] Could not store calendar event:", err);
  }
}

function isMissingColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    (lower.includes("could not find") && lower.includes("column"))
  );
}

export async function rememberResolvedCalendarEvent(
  input: RememberResolvedCalendarEventInput
): Promise<void> {
  if (!input.contactId && !input.title && !input.startTime) return;

  try {
    const supabase = createServerSupabase();
    const lastSyncedAt = new Date().toISOString();
    const calendarId = input.calendarId?.trim() || "primary";

    const { data: existing, error: lookupError } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("user_id", input.userId)
      .eq("provider", input.provider)
      .eq("external_event_id", input.externalEventId)
      .maybeSingle();

    if (lookupError) {
      if (isCalendarEventsTableMissing(lookupError.message)) return;
      console.error(
        "[calendar-sync] Could not look up resolved calendar_events:",
        lookupError.message
      );
      return;
    }

    const row: Record<string, unknown> = {
      user_id: input.userId,
      provider: input.provider,
      external_event_id: input.externalEventId,
      calendar_id: calendarId,
      is_organizer: input.isOrganizer ?? true,
      is_read_only: input.isReadOnly ?? false,
      sync_status: "synced",
      last_synced_at: lastSyncedAt,
      updated_at: lastSyncedAt,
    };
    if (input.contactId) row.contact_id = input.contactId;
    if (input.title?.trim()) row.title = input.title.trim();
    if (input.startTime) row.start_time = input.startTime;

    const existingId = (existing as { id?: string } | null)?.id;
    const write = existingId
      ? supabase.from("calendar_events").update(row as never).eq("id", existingId)
      : supabase
          .from("calendar_events")
          .insert({ ...row, created_at: lastSyncedAt } as never);

    const { error } = await write;
    if (error && isMissingColumnError(error.message)) {
      delete row.contact_id;
      delete row.title;
      delete row.start_time;
      const retry = existingId
        ? supabase.from("calendar_events").update(row as never).eq("id", existingId)
        : supabase
            .from("calendar_events")
            .insert({ ...row, created_at: lastSyncedAt } as never);
      const retried = await retry;
      if (retried.error) {
        console.error(
          "[calendar-sync] Could not store resolved calendar event:",
          retried.error.message
        );
      }
      return;
    }

    if (error) {
      console.error(
        "[calendar-sync] Could not store resolved calendar event:",
        error.message
      );
    }
  } catch (err) {
    console.error("[calendar-sync] Could not store resolved calendar event:", err);
  }
}

export function isCalendarEventsTableMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("calendar_events") &&
    (lower.includes("does not exist") ||
      lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("relation"))
  );
}
