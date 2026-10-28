import { rememberExternalCalendarEvent } from "@/lib/calendar/calendar-events";
import type { CalendarAttendee } from "@/lib/calendar/calendar-attendees";
import { getValidOutlookAccessToken } from "@/lib/calendar/connections";
import { createServerSupabase } from "@/lib/supabase/server";

export type OutlookCalendarEventPayload = {
  userId: string;
  interactionId: string;
  title: string;
  scheduledAt: string;
  scheduledEndAt?: string;
  notes?: string | null;
  attendees: CalendarAttendee[];
};

const GRAPH_EVENTS = "https://graph.microsoft.com/v1.0/me/events";

function graphDateTime(iso: string): { dateTime: string; timeZone: string } {
  return {
    dateTime: new Date(iso).toISOString().replace(/\.\d{3}Z$/, ""),
    timeZone: "UTC",
  };
}

function resolveEventTimes(payload: OutlookCalendarEventPayload): {
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
} {
  const start = new Date(payload.scheduledAt);
  const end = payload.scheduledEndAt
    ? new Date(payload.scheduledEndAt)
    : new Date(start.getTime() + 60 * 60 * 1000);

  return {
    start: graphDateTime(start.toISOString()),
    end: graphDateTime(end.toISOString()),
  };
}

function buildEventBody(payload: OutlookCalendarEventPayload) {
  const { start, end } = resolveEventTimes(payload);
  const descriptionParts = [
    payload.notes?.trim() || "",
    "Created with KinSight",
  ].filter(Boolean);

  return {
    subject: payload.title,
    body: {
      contentType: "text",
      content: descriptionParts.join("\n\n"),
    },
    start,
    end,
    attendees: payload.attendees.map((attendee) => ({
      emailAddress: {
        address: attendee.email,
        name: attendee.displayName ?? attendee.email,
      },
      type: "required",
    })),
  };
}

async function outlookCalendarRequest(input: {
  accessToken: string;
  method: "POST" | "PATCH";
  eventId?: string;
  body: unknown;
}): Promise<{ id?: string; error?: string }> {
  const url = input.eventId
    ? `${GRAPH_EVENTS}/${encodeURIComponent(input.eventId)}`
    : GRAPH_EVENTS;

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
        `Outlook Calendar ${input.method} failed (${res.status}).`,
    };
  }

  return { id: data.id };
}

export async function upsertOutlookCalendarEvent(
  payload: OutlookCalendarEventPayload
): Promise<{ eventId?: string; error?: string }> {
  const token = await getValidOutlookAccessToken(payload.userId);

  if (!token.connected || !token.accessToken) {
    return {
      error: token.error ?? "Outlook Calendar is not connected.",
    };
  }

  const body = buildEventBody(payload);
  const existingEventId = payload.interactionId
    ? await readExistingOutlookEventId(payload.interactionId)
    : null;

  const result = existingEventId
    ? await outlookCalendarRequest({
        accessToken: token.accessToken,
        method: "PATCH",
        eventId: existingEventId,
        body,
      })
    : await outlookCalendarRequest({
        accessToken: token.accessToken,
        method: "POST",
        body,
      });

  if (result.error || !result.id) {
    return {
      error: result.error ?? "Outlook Calendar did not return an event id.",
    };
  }

  await rememberExternalCalendarEvent({
    userId: payload.userId,
    interactionId: payload.interactionId,
    provider: "outlook",
    externalEventId: result.id,
    calendarId: "primary",
    isOrganizer: true,
    isReadOnly: false,
    syncStatus: "synced",
  });

  return { eventId: result.id };
}

async function readExistingOutlookEventId(
  interactionId: string
): Promise<string | null> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("calendar_events")
      .select("external_event_id")
      .eq("scheduled_interaction_id", interactionId)
      .eq("provider", "outlook")
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
    if (row.source && row.source !== "outlook") return null;
    return row.external_event_id?.trim() || null;
  } catch {
    return null;
  }
}
