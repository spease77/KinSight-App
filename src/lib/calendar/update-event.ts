import { patchGoogleCalendarEvent } from "@/lib/calendar/google-events";
import { patchOutlookCalendarEvent } from "@/lib/calendar/outlook-events";
import { syncMeetingToExternalCalendars } from "@/lib/calendar/sync-meeting";
import { createServerSupabase } from "@/lib/supabase/server";
import { updateAgendaItem } from "@/lib/supabase/scheduled-interactions";
import { composeMeetingNotes, parseMeetingNotes } from "@/types/agenda-meeting";
import {
  calendarSourceLabel,
  type InteractionSource,
  type ScheduledInteraction,
} from "@/types/scheduled-interaction";

export type CalendarEventUpdateInput = {
  userId: string;
  id: string;
  source: InteractionSource;
  externalEventId?: string | null;
  calendarId?: string | null;
  title: string;
  scheduledAt: string;
  scheduledEndAt?: string;
  location?: string | null;
  notes?: string | null;
};

export type CalendarEventUpdateResult = {
  updatedIn: string;
  interaction?: ScheduledInteraction;
  error?: string;
  needsReauth?: boolean;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveExternalEventId(input: CalendarEventUpdateInput): string | null {
  if (input.externalEventId?.trim()) return input.externalEventId.trim();

  if (input.source === "google" && input.id.startsWith("google-")) {
    const parts = input.id.split("-");
    return parts.slice(2).join("-") || null;
  }

  if (input.source === "outlook" && input.id.startsWith("outlook-")) {
    const parts = input.id.split("-");
    return parts.slice(2).join("-") || null;
  }

  return null;
}

export async function updateCalendarEvent(
  input: CalendarEventUpdateInput
): Promise<CalendarEventUpdateResult> {
  const title = input.title.trim();
  if (!title) {
    return { updatedIn: calendarSourceLabel(input.source), error: "Title is required." };
  }

  const start = new Date(input.scheduledAt);
  if (Number.isNaN(start.getTime())) {
    return {
      updatedIn: calendarSourceLabel(input.source),
      error: "Enter a valid date and time.",
    };
  }

  if (input.source === "google") {
    const eventId = resolveExternalEventId(input);
    if (!eventId) {
      return {
        updatedIn: "Google Calendar",
        error: "This Google event is missing an external id.",
      };
    }

    const patched = await patchGoogleCalendarEvent({
      userId: input.userId,
      eventId,
      calendarId: input.calendarId,
      title,
      scheduledAt: input.scheduledAt,
      scheduledEndAt: input.scheduledEndAt,
      location: input.location,
      notes: input.notes,
    });

    if (patched.error) {
      return {
        updatedIn: "Google Calendar",
        error: patched.error,
        needsReauth: patched.needsReauth,
      };
    }

    if (UUID_RE.test(input.id)) {
      await persistKinSightRow(input, title);
    }

    return { updatedIn: "Google Calendar" };
  }

  if (input.source === "outlook") {
    const eventId = resolveExternalEventId(input);
    if (!eventId) {
      return {
        updatedIn: "Outlook",
        error: "This Outlook event is missing an external id.",
      };
    }

    const patched = await patchOutlookCalendarEvent({
      userId: input.userId,
      eventId,
      title,
      scheduledAt: input.scheduledAt,
      scheduledEndAt: input.scheduledEndAt,
      location: input.location,
      notes: input.notes,
    });

    if (patched.error) {
      return {
        updatedIn: "Outlook",
        error: patched.error,
        needsReauth: patched.needsReauth,
      };
    }

    if (UUID_RE.test(input.id)) {
      await persistKinSightRow(input, title);
    }

    return { updatedIn: "Outlook" };
  }

  const persisted = await persistKinSightRow(input, title);
  if (persisted.error || !persisted.interaction) {
    return {
      updatedIn: "KinSight",
      error: persisted.error ?? "Could not update this event.",
    };
  }

  const synced = await syncMeetingToExternalCalendars({
    userId: input.userId,
    interactionId: persisted.interaction.id,
    contactName: persisted.interaction.contactName,
    title,
    scheduledAt: input.scheduledAt,
    scheduledEndAt: input.scheduledEndAt,
    notes: persisted.interaction.notes,
  });

  const updatedIn =
    synced.providers.length === 0
      ? "KinSight"
      : synced.providers.length === 2
        ? "Google Calendar and Outlook"
        : synced.providers[0] === "google"
          ? "Google Calendar"
          : "Outlook";

  return { updatedIn, interaction: persisted.interaction };
}

async function persistKinSightRow(
  input: CalendarEventUpdateInput,
  title: string
): Promise<{ interaction?: ScheduledInteraction; error?: string }> {
  if (!UUID_RE.test(input.id)) {
    return {};
  }

  let meetingFormat = parseMeetingNotes(null).meetingFormat;
  let existingLocation = "";
  let existingUserNotes = "";
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from("scheduled_interactions")
      .select("notes")
      .eq("id", input.id)
      .maybeSingle();
    const parsed = parseMeetingNotes(
      (data as { notes?: string | null } | null)?.notes ?? null
    );
    meetingFormat = parsed.meetingFormat;
    existingLocation = parsed.location;
    existingUserNotes = parsed.userNotes;
  } catch {
    // Compose with whatever the client sent.
  }

  const composed = composeMeetingNotes(
    meetingFormat,
    input.notes == null ? existingUserNotes : input.notes.trim(),
    input.location ?? existingLocation
  );

  return updateAgendaItem(input.id, {
    title,
    scheduledAt: input.scheduledAt,
    notes: composed,
  });
}
