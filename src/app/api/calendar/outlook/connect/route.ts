import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isValidCalendarDeviceId } from "@/lib/calendar/session";
import {
  attachOutlookOauthCookies,
  buildOutlookAuthorizeUrl,
  isOutlookCalendarConfigured,
  redirectOutlookHome,
} from "@/lib/calendar/outlook-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOutlookCalendarConfigured()) {
    return redirectOutlookHome(request, {
      calendar: "error",
      reason: "not_configured",
    });
  }

  const device = new URL(request.url).searchParams.get("device");
  const nonce = randomBytes(32).toString("hex");
  const state = isValidCalendarDeviceId(device) ? `${nonce}.${device}` : nonce;
  const authorizeUrl = buildOutlookAuthorizeUrl({ request, state });
  const response = NextResponse.redirect(authorizeUrl);
  return attachOutlookOauthCookies(response, request, { state });
}
