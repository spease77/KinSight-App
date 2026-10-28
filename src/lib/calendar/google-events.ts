import { rememberExternalCalendarEvent } from "@/lib/calendar/calendar-events";
import { getValidGoogleAccessToken } from "@/lib/calendar/connections";
import type { CalendarAttendee } from "@/lib/calendar/calendar-attendees";
import { createServerSupabase } from "@/lib/supabase/server";

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
  calendarId?: string | null;
  eventId?: string;
  body: unknown;
  sendUpdates: "all" | "none";
}): Promise<{ id?: string; error?: string; status?: number; needsReauth?: boolean }> {
  const calendarId = encodeURIComponent(input.calendarId?.trim() || "primary");
  const path = input.eventId
    ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(input.eventId)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

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
      status: res.status,
      needsReauth: res.status === 401,
      error:
        data.error?.message ??
        `Google Calendar ${input.method} failed (${res.status}).`,
    };
  }

  return { id: data.id, status: res.status };
}

async function rememberSyncedEvent(
  userId: string,
  interactionId: string,
  eventId: string
): Promise<void> {
  await rememberExternalCalendarEvent({
    userId,
    interactionId,
    provider: "google",
    externalEventId: eventId,
    calendarId: "primary",
    isOrganizer: true,
    isReadOnly: false,
    syncStatus: "synced",
  });
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

  await rememberSyncedEvent(payload.userId, payload.interactionId, result.id);
  return { eventId: result.id };
}

export async function patchGoogleCalendarEvent(input: {
  userId: string;
  eventId: string;
  calendarId?: string | null;
  title: string;
  scheduledAt: string;
  scheduledEndAt?: string;
  location?: string | null;
  notes?: string | null;
}): Promise<{ error?: string; needsReauth?: boolean }> {
  const token = await getValidGoogleAccessToken(input.userId);

  if (token.needsReauth || !token.connected) {
    return {
      needsReauth: true,
      error: token.error ?? "Google Calendar is not connected.",
    };
  }

  if (!token.accessToken) {
    return {
      needsReauth: true,
      error: token.error ?? "Google Calendar is not connected.",
    };
  }

  const start = new Date(input.scheduledAt);
  const end = input.scheduledEndAt
    ? new Date(input.scheduledEndAt)
    : new Date(start.getTime() + 60 * 60 * 1000);

  const result = await googleCalendarRequest({
    accessToken: token.accessToken,
    method: "PATCH",
    calendarId: input.calendarId,
    eventId: input.eventId,
    sendUpdates: "none",
    body: {
      summary: input.title,
      description: input.notes?.trim() || "",
      location: input.location?.trim() || "",
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });

  if (result.error) {
    return {
      error: result.error,
      needsReauth: result.needsReauth,
    };
  }

  return {};
}

async function readExistingGoogleEventId(
  interactionId: string
): Promise<string | null> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("calendar_events")
      .select("external_event_id")
      .eq("scheduled_interaction_id", interactionId)
      .eq("provider", "google")
      .maybeSingle();

    if (!error && data) {
      const id = (data as { external_event_id?: string | null })
        .external_event_id;
      if (id?.trim()) return id.trim();
    }

    const fallback = await supabase
      .from("scheduled_interactions")
      .select("external_event_id, source")
      .eq("id", interactionId)
      .maybeSingle();

    if (fallback.error || !fallback.data) return null;
    const row = fallback.data as {
      external_event_id?: string | null;
      source?: string | null;
    };
    if (row.source && row.source !== "google" && row.source !== "kinsight") {
      return null;
    }
    return row.external_event_id?.trim() || null;
  } catch {
    return null;
  }
}
