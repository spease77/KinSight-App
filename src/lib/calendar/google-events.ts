import { createServerSupabase } from "@/lib/supabase/server";
import { getValidGoogleAccessToken } from "@/lib/calendar/connections";
import type { CalendarAttendee } from "@/lib/calendar/calendar-attendees";

export type GoogleCalendarEventPayload = {
  userId: string;
  interactionId: string;
  title: string;
  scheduledAt: string;
  scheduledEndAt?: string;
  notes?: string | null;
  attendees: CalendarAttendee[];
};

type GoogleEventTimes = {
  start: { dateTime: string };
  end: { dateTime: string };
};

function resolveEventTimes(payload: GoogleCalendarEventPayload): GoogleEventTimes {
  const start = new Date(payload.scheduledAt);
  const end = payload.scheduledEndAt
    ? new Date(payload.scheduledEndAt)
    : new Date(start.getTime() + 60 * 60 * 1000);

  return {
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

function buildEventBody(
  payload: GoogleCalendarEventPayload
) {
  const { start, end } = resolveEventTimes(payload);
  const descriptionParts = [
    payload.notes?.trim() || "",
    "Created with KinSight",
  ].filter(Boolean);

  return {
    summary: payload.title,
    description: descriptionParts.join("\n\n"),
    start,
    end,
    attendees: payload.attendees.map((attendee) => ({
      email: attendee.email,
      displayName: attendee.displayName,
    })),
    extendedProperties: {
      private: {
        kinsightInteractionId: payload.interactionId,
      },
    },
    source: {
      title: "KinSight",
      url: "https://kin-sight-app.vercel.app/agenda",
    },
  };
}

async function googleCalendarRequest(input: {
  accessToken: string;
  method: "POST" | "PATCH";
  eventId?: string;
  body: unknown;
  sendUpdates: "all" | "none";
}): Promise<{ id?: string; error?: string }> {
  const path = input.eventId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(input.eventId)}`
    : "https://www.googleapis.com/calendar/v3/calendars/primary/events";

  const url = new URL(path);
  url.searchParams.set("sendUpdates", input.sendUpdates);

  const res = await fetch(url, {
    method: input.method,
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.body),
    cache: "no-store",
  });

  const data = (await res.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!res.ok || !data.id) {
    return {
      error:
        data.error?.message ??
        `Google Calendar ${input.method} failed (${res.status}).`,
    };
  }

  return { id: data.id };
}

async function rememberSyncedEvent(
  interactionId: string,
  eventId: string
): Promise<void> {
  try {
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from("scheduled_interactions")
      .update({
        external_event_id: eventId,
        last_synced_at: new Date().toISOString(),
      } as never)
      .eq("id", interactionId);

    if (error) {
      console.error(
        "[calendar-sync] Could not store Google event id:",
        error.message
      );
    }
  } catch (err) {
    console.error("[calendar-sync] Could not store Google event id:", err);
  }
}

export async function upsertGoogleCalendarEvent(
  payload: GoogleCalendarEventPayload
): Promise<{ eventId?: string; error?: string }> {
  const token = await getValidGoogleAccessToken(payload.userId);

  if (!token.connected || !token.accessToken) {
    return {
      error: token.error ?? "Google Calendar is not connected.",
    };
  }

  if (token.error && !token.accessToken) {
    return { error: token.error };
  }

  const sendUpdates = payload.attendees.length > 0 ? "all" : "none";
  const body = buildEventBody(payload);
  const existingEventId = payload.interactionId
    ? await readExistingGoogleEventId(payload.interactionId)
    : null;

  const result = existingEventId
    ? await googleCalendarRequest({
        accessToken: token.accessToken,
        method: "PATCH",
        eventId: existingEventId,
        body,
        sendUpdates,
      })
    : await googleCalendarRequest({
        accessToken: token.accessToken,
        method: "POST",
        body,
        sendUpdates,
      });

  if (result.error || !result.id) {
    return { error: result.error ?? "Google Calendar did not return an event id." };
  }

  await rememberSyncedEvent(payload.interactionId, result.id);
  return { eventId: result.id };
}

async function readExistingGoogleEventId(
  interactionId: string
): Promise<string | null> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("scheduled_interactions")
      .select("external_event_id")
      .eq("id", interactionId)
      .maybeSingle();

    if (error || !data) return null;
    const eventId = (data as { external_event_id?: string | null }).external_event_id;
    return eventId?.trim() || null;
  } catch {
    return null;
  }
}
