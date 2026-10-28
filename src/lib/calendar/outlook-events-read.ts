import { getValidOutlookAccessToken } from "@/lib/calendar/connections";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";

const GRAPH = "https://graph.microsoft.com/v1.0";
const MAX_CALENDARS = 15;
const MAX_PAGES_PER_CALENDAR = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

type OutlookCalendar = {
  id: string;
  name?: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
};

type OutlookDateTime = {
  dateTime?: string;
  timeZone?: string;
};

type OutlookEvent = {
  id?: string;
  subject?: string;
  bodyPreview?: string;
  isCancelled?: boolean;
  isAllDay?: boolean;
  isOrganizer?: boolean;
  start?: OutlookDateTime;
  end?: OutlookDateTime;
  location?: { displayName?: string };
  attendees?: Array<{
    type?: string;
    status?: { response?: string };
    emailAddress?: { name?: string; address?: string };
  }>;
  organizer?: { emailAddress?: { name?: string; address?: string } };
  onlineMeeting?: { joinUrl?: string };
  webLink?: string;
};

export type OutlookAgendaResult = {
  connected: boolean;
  interactions: ScheduledInteraction[];
  error?: string;
};

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function graphGet<T>(
  accessToken: string,
  url: URL
): Promise<{ data?: T; status: number; error?: string }> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!res.ok) {
    return {
      status: res.status,
      error:
        body.error?.message ??
        `Outlook Calendar request failed (${res.status}).`,
    };
  }
  return { data: body, status: res.status };
}

async function listCalendars(accessToken: string): Promise<OutlookCalendar[]> {
  const url = new URL(`${GRAPH}/me/calendars`);
  url.searchParams.set("$select", "id,name,isDefaultCalendar,canEdit");
  url.searchParams.set("$top", "50");

  const result = await graphGet<{ value?: OutlookCalendar[] }>(
    accessToken,
    url
  );

  if (!result.data?.value) {
    return [{ id: "primary", name: "Outlook Calendar", canEdit: true }];
  }

  return result.data.value.slice(0, MAX_CALENDARS);
}

async function listCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<OutlookEvent[]> {
  const events: OutlookEvent[] = [];
  const start = new URL(
    calendarId === "primary"
      ? `${GRAPH}/me/calendarView`
      : `${GRAPH}/me/calendars/${encodeURIComponent(calendarId)}/calendarView`
  );
  start.searchParams.set("startDateTime", timeMin);
  start.searchParams.set("endDateTime", timeMax);
  start.searchParams.set("$top", "100");
  start.searchParams.set(
    "$select",
    "id,subject,bodyPreview,isCancelled,isAllDay,isOrganizer,start,end,location,attendees,organizer,onlineMeeting,webLink"
  );

  type CalendarViewPage = {
    value?: OutlookEvent[];
    "@odata.nextLink"?: string;
  };

  let nextUrl: URL | null = start;

  for (let page = 0; page < MAX_PAGES_PER_CALENDAR && nextUrl; page += 1) {
    const result: { data?: CalendarViewPage; status: number; error?: string } =
      await graphGet<CalendarViewPage>(accessToken, nextUrl);

    if (!result.data?.value) break;
    events.push(...result.data.value);
    nextUrl = result.data["@odata.nextLink"]
      ? new URL(result.data["@odata.nextLink"])
      : null;
  }

  return events;
}

function toIso(value: OutlookDateTime | undefined): string | null {
  const raw = value?.dateTime?.trim();
  if (!raw) return null;
  const parsed = new Date(raw.endsWith("Z") ? raw : `${raw}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toInteraction(
  event: OutlookEvent,
  calendar: OutlookCalendar,
  syncedAt: string
): ScheduledInteraction | null {
  if (!event.id || event.isCancelled) return null;

  const startIso = toIso(event.start);
  if (!startIso) return null;

  const endIso = toIso(event.end);
  const durationMinutes =
    endIso && !event.isAllDay
      ? Math.max(
          1,
          Math.round(
            (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
          )
        )
      : event.isAllDay
        ? 24 * 60
        : null;

  const guests = (event.attendees ?? []).filter(
    (attendee) =>
      attendee.type !== "resource" &&
      attendee.emailAddress?.address &&
      attendee.emailAddress.address.toLowerCase() !==
        event.organizer?.emailAddress?.address?.toLowerCase()
  );
  const guest = guests[0];
  const guestName = guest?.emailAddress
    ? guest.emailAddress.name?.trim() ||
      displayNameFromEmail(guest.emailAddress.address as string)
    : null;
  const calendarName = calendar.name?.trim() || "Outlook Calendar";
  const isOrganizer = event.isOrganizer !== false;
  const isReadOnly = calendar.canEdit === false || !isOrganizer;

  return {
    id: `outlook-${calendar.id}-${event.id}`,
    contactId: "outlook-event",
    contactName: guestName ?? calendarName,
    contactType: null,
    scheduledAt: event.isAllDay ? `${startIso.slice(0, 10)}T00:00:00` : startIso,
    title: event.subject?.trim() || "(No title)",
    durationMinutes,
    behavioralTags: [],
    notes: event.bodyPreview?.trim() || null,
    source: "outlook",
    externalEventId: event.id,
    lastSyncedAt: syncedAt,
    calendarId: calendar.id,
    isOrganizer,
    isReadOnly,
    syncStatus: "synced",
    location: event.location?.displayName?.trim() || null,
    attendees: guests
      .map((attendee) => {
        const email = attendee.emailAddress?.address ?? "";
        const name = attendee.emailAddress?.name?.trim();
        return name && email ? `${name} (${email})` : name || email;
      })
      .filter(Boolean),
    meetingUrl: event.onlineMeeting?.joinUrl ?? event.webLink ?? null,
  };
}

export async function fetchOutlookAgendaInteractions(
  userId: string,
  range?: { timeMin?: string; timeMax?: string }
): Promise<OutlookAgendaResult> {
  const token = await getValidOutlookAccessToken(userId);

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
        err instanceof Error
          ? err.message
          : "Could not load Outlook Calendar events.",
    };
  }
}
