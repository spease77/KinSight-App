import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isValidCalendarDeviceId } from "@/lib/calendar/session";
import {
  attachOauthCookies,
  buildGoogleAuthorizeUrl,
  isGoogleCalendarConfigured,
  redirectHome,
} from "@/lib/calendar/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isGoogleCalendarConfigured()) {
    return redirectHome(request, {
      calendar: "error",
      reason: "not_configured",
    });
  }

  // The app's device id rides along in `state` so the callback (which may run
  // in a Safari sheet without the app's cookies) knows which install to attach
  // the connection to.
  const device = new URL(request.url).searchParams.get("device");
  const nonce = randomBytes(32).toString("hex");
  const state = isValidCalendarDeviceId(device) ? `${nonce}.${device}` : nonce;
  const authorizeUrl = buildGoogleAuthorizeUrl({ request, state });
  const response = NextResponse.redirect(authorizeUrl);
  return attachOauthCookies(response, request, { state });
}
