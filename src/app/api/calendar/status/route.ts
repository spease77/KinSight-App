import { getCalendarConnection } from "@/lib/calendar/connections";
import {
  getGoogleRedirectUri,
  isGoogleCalendarConfigured,
} from "@/lib/calendar/google-oauth";
import { resolveCalendarUserId } from "@/lib/calendar/session";
import type { CalendarStatusResponse } from "@/types/calendar-connection";

export const dynamic = "force-dynamic";

function emptyStatus(
  request: Request,
  signedIn: boolean
): CalendarStatusResponse {
  return {
    signedIn,
    googleRedirectUri: getGoogleRedirectUri(request),
    google: {
      provider: "google",
      configured: isGoogleCalendarConfigured(),
      connected: false,
      accountEmail: null,
    },
    outlook: {
      provider: "outlook",
      configured: false,
      connected: false,
      accountEmail: null,
    },
  };
}

export async function GET(request: Request) {
  const userId = await resolveCalendarUserId(request);

  if (!userId) {
    return Response.json(emptyStatus(request, false), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const google = await getCalendarConnection(userId, "google");

  const body: CalendarStatusResponse = {
    signedIn: true,
    googleRedirectUri: getGoogleRedirectUri(request),
    google: {
      provider: "google",
      configured: isGoogleCalendarConfigured(),
      connected: Boolean(google.connection),
      accountEmail: google.connection?.account_email ?? null,
      setupRequired: google.setupRequired,
    },
    outlook: {
      provider: "outlook",
      configured: false,
      connected: false,
      accountEmail: null,
    },
  };

  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
