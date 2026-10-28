import { cookies } from "next/headers";
import { upsertCalendarConnection } from "@/lib/calendar/connections";
import {
  attachCalendarSessionCookie,
  calendarUserIdFromDeviceId,
  calendarUserIdFromOutlookOid,
  isValidCalendarDeviceId,
} from "@/lib/calendar/session";
import {
  OUTLOOK_OAUTH_STATE_COOKIE,
  clearOutlookOauthCookies,
  exchangeOutlookAuthorizationCode,
  fetchOutlookAccountProfile,
  isOutlookCalendarConfigured,
  redirectOutlookHome,
} from "@/lib/calendar/outlook-oauth";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) =>
    clearOutlookOauthCookies(
      redirectOutlookHome(request, { calendar: "error", reason })
    );

  if (url.searchParams.get("error")) {
    return fail(
      url.searchParams.get("error") === "access_denied" ? "denied" : "token_exchange"
    );
  }

  if (!isOutlookCalendarConfigured()) {
    return fail("not_configured");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return fail("missing_code");
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OUTLOOK_OAUTH_STATE_COOKIE)?.value;

  if (!expectedState || state !== expectedState) {
    return fail("invalid_state");
  }

  try {
    const tokens = await exchangeOutlookAuthorizationCode({ request, code });
    const profile = await fetchOutlookAccountProfile(tokens.accessToken);
    if (!profile) {
      return fail("token_exchange");
    }

    const kinSightUser = await getAuthenticatedUser(request);
    const deviceId = state.includes(".")
      ? state.slice(state.indexOf(".") + 1)
      : null;
    const userId =
      kinSightUser?.id ??
      (isValidCalendarDeviceId(deviceId)
        ? calendarUserIdFromDeviceId(deviceId)
        : calendarUserIdFromOutlookOid(profile.id));

    const saved = await upsertCalendarConnection({
      userId,
      provider: "outlook",
      accountEmail: profile.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
    });

    if (saved.setupRequired) {
      return fail("setup");
    }

    if (saved.error) {
      console.error("[outlook-oauth] could not store connection:", saved.error);
      return fail("save");
    }

    const response = clearOutlookOauthCookies(
      redirectOutlookHome(request, { calendar: "connected" })
    );
    return attachCalendarSessionCookie(response, request, userId);
  } catch (err) {
    console.error("[outlook-oauth] callback failed:", err);
    return fail("token_exchange");
  }
}
