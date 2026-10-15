import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
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

  const state = randomBytes(32).toString("hex");
  const authorizeUrl = buildGoogleAuthorizeUrl({ request, state });
  const response = NextResponse.redirect(authorizeUrl);
  return attachOauthCookies(response, request, { state });
}
