import { getValidGoogleAccessToken } from "@/lib/calendar/connections";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";

const API_BASE = "https://www.googleapis.com/calendar/v3";
const MAX_PAGES_PER_CALENDAR = 4;
const MAX_CALENDARS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

type GoogleCalendarListEntry = {
  id: string;
  summary?: string;
  summaryOverride?: string;
  selected?: boolean;
  hidden?: boolean;
  primary?: boolean;
};

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  organizer?: { email?: string; displayName?: string; self?: boolean };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    self?: boolean;
    resource?: boolean;
  }>;
  extendedProperties?: { private?: Record<string, string> };
};

export type GoogleAgendaResult = {
  connected: boolean;
  interactions: ScheduledInteraction[];
  error?: string;
};

async function googleGet<T>(
  accessToken: string,
  url: URL
): Promise<{ data?: T; status: number; error?: string }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!res.ok) {
    return {
      status: res.status,
      error: body.error?.message ?? `Google Calendar request failed (${res.status}).`,
    };
  }
  return { data: body, status: res.status };
}

async function listCalendars(
  accessToken: string
): Promise<GoogleCalendarListEntry[]> {
  const url = new URL(`${API_BASE}/users/me/calendarList`);
  url.searchParams.set("minAccessRole", "reader");
  url.searchParams.set("maxResults", "100");

  const result = await googleGet<{ items?: GoogleCalendarListEntry[] }>(
    accessToken,
    url
  );

  // Connections made before the calendar-list scope existed only allow the
  // primary calendar; fall back to it instead of failing.
  if (!result.data?.items) {
    return [{ id: "primary", summary: "Google Calendar", primary: true }];
  }

  const visible = result.data.items.filter(
    (calendar) => !calendar.hidden && calendar.selected !== false
  );
  const calendars = visible.length > 0 ? visible : result.data.items;
  return calendars.slice(0, MAX_CALENDARS);
}

async function listCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleEvent[]> {
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES_PER_CALENDAR; page += 1) {
    const url = new URL(
      `${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`
    );
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("maxResults", "500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const result = await googleGet<{
      items?: GoogleEvent[];
      nextPageToken?: string;
    }>(accessToken, url);

    if (!result.data) break;
    events.push(...(result.data.items ?? []));
    pageToken = result.data.nextPageToken;
    if (!pageToken) break;
  }

  return events;
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toInteraction(
  event: GoogleEvent,
  calendar: GoogleCalendarListEntry,
  syncedAt: string
): ScheduledInteraction | null {
  if (!event.id || event.status === "cancelled") return null;

  // Meetings created from KinSight were pushed to Google; they already exist
  // in the Agenda, so showing the Google copy would duplicate them.
  if (event.extendedProperties?.private?.kinsightInteractionId) return null;

  const startDate = event.start?.date;
  const startDateTime = event.start?.dateTime;
  if (!startDate && !startDateTime) return null;

  let scheduledAt: string;
  let durationMinutes: number | null;

  if (startDateTime) {
    scheduledAt = new Date(startDateTime).toISOString();
    const end = event.end?.dateTime ? new Date(event.end.dateTime).getTime() : NaN;
    const minutes = Math.round((end - new Date(startDateTime).getTime()) / 60000);
    durationMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : null;
  } else {
    // All-day event: a plain local date; the app parses it in the device's time zone.
    scheduledAt = `${startDate}T00:00:00`;
    const endDate = event.end?.date;
    const days =
      endDate && startDate
        ? Math.max(
            1,
            Math.round(
              (new Date(`${endDate}T00:00:00Z`).getTime() -
                new Date(`${startDate}T00:00:00Z`).getTime()) /
                DAY_MS
            )
          )
        : 1;
    durationMinutes = days * 24 * 60;
  }

  const guest = event.attendees?.find(
    (attendee) => !attendee.self && !attendee.resource && attendee.email
  );
  const guestName = guest
    ? guest.displayName?.trim() || displayNameFromEmail(guest.email as string)
    : null;
  const calendarName =
    calendar.summaryOverride?.trim() || calendar.summary?.trim() || "Google Calendar";

  return {
    id: `google-${calendar.id}-${event.id}`,
    contactId: "google-event",
    contactName: guestName ?? calendarName,
    contactType: null,
    scheduledAt,
    title: event.summary?.trim() || "(No title)",
    durationMinutes,
    behavioralTags: [],
    notes: event.description?.trim() || null,
    source: "google",
    externalEventId: event.id,
    lastSyncedAt: syncedAt,
  };
}

export async function fetchGoogleAgendaInteractions(
  userId: string,
  range?: { timeMin?: string; timeMax?: string }
): Promise<GoogleAgendaResult> {
  const token = await getValidGoogleAccessToken(userId);

  if (!token.connected) {
    return { connected: false, interactions: [] };
  }

  if (!token.accessToken) {
    return { connected: true, interactions: [], error: token.error };
  }

  const now = Date.now();
  const timeMin = range?.timeMin ?? new Date(now - 120 * DAY_MS).toISOString();
  const timeMax = range?.timeMax ?? new Date(now + 400 * DAY_MS).toISOString();
  const syncedAt = new Date(now).toISOString();

  try {
    const calendars = await listCalendars(token.accessToken);
    const perCalendar = await Promise.all(
      calendars.map(async (calendar) => {
        const events = await listCalendarEvents(
          token.accessToken as string,
          calendar.id,
          timeMin,
          timeMax
        );
        return events
          .map((event) => toInteraction(event, calendar, syncedAt))
          .filter((item): item is ScheduledInteraction => item !== null);
      })
    );

    const interactions = perCalendar
      .flat()
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );

    return { connected: true, interactions };
  } catch (err) {
    return {
      connected: true,
      interactions: [],
      error:
        err instanceof Error ? err.message : "Could not load Google Calendar events.",
    };
  }
}
