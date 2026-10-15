import type { AgendaMeetingType } from "@/types/agenda-meeting";
import {
  buildCalendarAttendees,
  buildCalendarAttendeesFromEmails,
  type CalendarAttendee,
} from "@/lib/calendar/calendar-attendees";
import { getCalendarConnection } from "@/lib/calendar/connections";
import { upsertGoogleCalendarEvent } from "@/lib/calendar/google-events";

export type CalendarSyncPayload = {
  userId?: string;
  interactionId: string;
  contactName: string;
  title: string;
  scheduledAt: string;
  scheduledEndAt?: string;
  meetingType?: AgendaMeetingType;
  notes?: string | null;
  /** Primary invitee email from the New Event form. */
  contactEmail?: string;
  /** All invitee emails selected in the New Event form. */
  contactEmails?: string[];
  attendees?: CalendarAttendee[];
};

export type CalendarSyncResult = {
  queued: boolean;
  providers: Array<"google" | "outlook">;
  inviteSent: boolean;
};

/**
 * Pushes a KinSight meeting to the signed-in user's connected calendars.
 * Google Calendar is free (OAuth + Calendar API). Outlook stays a no-op until connected.
 */
export async function syncMeetingToExternalCalendars(
  payload: CalendarSyncPayload
): Promise<CalendarSyncResult> {
  const providers: Array<"google" | "outlook"> = [];
  const attendees =
    payload.attendees ??
    (payload.contactEmails && payload.contactEmails.length > 0
      ? buildCalendarAttendeesFromEmails(
          payload.contactEmails,
          payload.contactName
        )
      : buildCalendarAttendees(payload.contactEmail, payload.contactName));
  const syncPayload = { ...payload, attendees };

  if (!payload.userId) {
    console.info(
      "[calendar-sync] Skipping Google Calendar — no signed-in user for this meeting.",
      payload.interactionId
    );
  } else {
    const google = await getCalendarConnection(payload.userId, "google");
    if (google.connection) {
      const pushed = await pushToGoogleCalendar(syncPayload, payload.userId);
      if (pushed) providers.push("google");
    } else if (google.setupRequired) {
      console.warn("[calendar-sync]", google.error);
    }
  }

  if (process.env.OUTLOOK_CALENDAR_SYNC_ENABLED === "true") {
    providers.push("outlook");
    await pushToOutlookCalendar(syncPayload);
  }

  if (providers.length === 0) {
    console.info(
      "[calendar-sync] No connected calendars — meeting saved as KinSight-only.",
      payload.interactionId
    );
  }

  return {
    queued: providers.length > 0,
    providers,
    inviteSent: attendees.length > 0 && providers.length > 0,
  };
}

async function pushToGoogleCalendar(
  payload: CalendarSyncPayload & { attendees: CalendarAttendee[] },
  userId: string
): Promise<boolean> {
  const result = await upsertGoogleCalendarEvent({
    userId,
    interactionId: payload.interactionId,
    title: payload.title,
    scheduledAt: payload.scheduledAt,
    scheduledEndAt: payload.scheduledEndAt,
    notes: payload.notes,
    attendees: payload.attendees,
  });

  if (result.error || !result.eventId) {
    console.error("[calendar-sync] Google Calendar push failed:", result.error);
    return false;
  }

  console.info("[calendar-sync] Google Calendar event saved", {
    interactionId: payload.interactionId,
    eventId: result.eventId,
    attendees: payload.attendees.map((attendee) => attendee.email),
  });
  return true;
}

async function pushToOutlookCalendar(
  payload: CalendarSyncPayload & { attendees: CalendarAttendee[] }
): Promise<void> {
  console.info("[calendar-sync] Outlook Calendar placeholder", {
    interactionId: payload.interactionId,
    subject: payload.title,
    start: payload.scheduledAt,
    end: payload.scheduledEndAt,
    attendees: payload.attendees.map((attendee) => ({
      emailAddress: {
        address: attendee.email,
        name: attendee.displayName ?? attendee.email,
      },
      type: "required",
    })),
  });
}
