import type { AgendaMeetingType } from "@/types/agenda-meeting";
import {
  buildCalendarAttendees,
  buildCalendarAttendeesFromEmails,
  type CalendarAttendee,
} from "@/lib/calendar/calendar-attendees";

export type CalendarSyncPayload = {
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
 * Placeholder for Microsoft Graph + Google Calendar background inserts.
 * Wire OAuth tokens and provider SDK calls here when integrations go live.
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

  if (process.env.GOOGLE_CALENDAR_SYNC_ENABLED === "true") {
    providers.push("google");
    await pushToGoogleCalendar(syncPayload);
  }

  if (process.env.OUTLOOK_CALENDAR_SYNC_ENABLED === "true") {
    providers.push("outlook");
    await pushToOutlookCalendar(syncPayload);
  }

  if (providers.length === 0) {
    console.info(
      "[calendar-sync] No external providers enabled — meeting saved as KinSight-only.",
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
  payload: CalendarSyncPayload & { attendees: CalendarAttendee[] }
): Promise<void> {
  // Google Calendar API — events.insert
  // attendees + sendUpdates: "all" triggers native invite emails (Accept/Decline).
  console.info("[calendar-sync] Google Calendar placeholder", {
    interactionId: payload.interactionId,
    summary: payload.title,
    start: payload.scheduledAt,
    end: payload.scheduledEndAt,
    attendees: payload.attendees.map((attendee) => ({ email: attendee.email })),
    sendUpdates: payload.attendees.length > 0 ? "all" : "none",
  });
}

async function pushToOutlookCalendar(
  payload: CalendarSyncPayload & { attendees: CalendarAttendee[] }
): Promise<void> {
  // Microsoft Graph API — POST /me/events
  // attendees[] triggers native Outlook invitation emails.
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
