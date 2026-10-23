import { cookies } from "next/headers";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";
import { upsertCalendarConnection } from "@/lib/calendar/connections";
import {
  attachCalendarSessionCookie,
  calendarUserIdFromDeviceId,
  calendarUserIdFromGoogleSub,
  isValidCalendarDeviceId,
} from "@/lib/calendar/session";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  clearOauthCookies,
  exchangeGoogleAuthorizationCode,
  fetchGoogleAccountProfile,
  isGoogleCalendarConfigured,
  redirectHome,
} from "@/lib/calendar/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) =>
    clearOauthCookies(redirectHome(request, { calendar: "error", reason }));

  if (url.searchParams.get("error") === "access_denied") {
    return fail("denied");
  }

  if (!isGoogleCalendarConfigured()) {
    return fail("not_configured");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return fail("missing_code");
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (!expectedState || state !== expectedState) {
    return fail("invalid_state");
  }

  try {
    const tokens = await exchangeGoogleAuthorizationCode({ request, code });
    const profile = await fetchGoogleAccountProfile(tokens.accessToken);
    if (!profile) {
      return fail("token_exchange");
    }

    const kinSightUser = await getAuthenticatedUser(request);
    const deviceId = state.includes(".") ? state.slice(state.indexOf(".") + 1) : null;
    const userId =
      kinSightUser?.id ??
      (isValidCalendarDeviceId(deviceId)
        ? calendarUserIdFromDeviceId(deviceId)
        : calendarUserIdFromGoogleSub(profile.id));

    const saved = await upsertCalendarConnection({
      userId,
      provider: "google",
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
      console.error("[google-oauth] could not store connection:", saved.error);
      return fail("save");
    }

    const response = clearOauthCookies(
      redirectHome(request, { calendar: "connected" })
    );
    return attachCalendarSessionCookie(response, request, userId);
  } catch (err) {
    console.error("[google-oauth] callback failed:", err);
    return fail("token_exchange");
  }
}
