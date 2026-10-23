import { NextResponse } from "next/server";
import { readEnv } from "@/lib/supabase/server";

export const GOOGLE_OAUTH_STATE_COOKIE = "kinsight_gcal_oauth_state";
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  // Read-only access to the calendar list so events from every calendar
  // (not just the primary one) can be shown in the Agenda.
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export type GoogleTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  scope?: string;
};

export function getGoogleClientId(): string | undefined {
  return readEnv("GOOGLE_CALENDAR_CLIENT_ID") ?? readEnv("GOOGLE_CLIENT_ID");
}

export function getGoogleClientSecret(): string | undefined {
  return (
    readEnv("GOOGLE_CALENDAR_CLIENT_SECRET") ?? readEnv("GOOGLE_CLIENT_SECRET")
  );
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(getGoogleClientId() && getGoogleClientSecret());
}

export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}

export function getGoogleRedirectUri(request: Request): string {
  const explicit = readEnv("GOOGLE_CALENDAR_REDIRECT_URI");
  if (explicit) return explicit.replace(/\/$/, "");
  return `${getRequestOrigin(request)}/api/calendar/google/callback`;
}

export function buildGoogleAuthorizeUrl(input: {
  request: Request;
  state: string;
}): string {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error("GOOGLE_CALENDAR_CLIENT_ID is not set.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(input.request),
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: input.state,
  });

  return `${AUTH_URL}?${params.toString()}`;
}

export function oauthCookieOptions(request: Request) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: new URL(request.url).protocol === "https:",
    maxAge: 10 * 60,
    path: "/",
  };
}

export function redirectHome(
  request: Request,
  params: Record<string, string>
): NextResponse {
  const url = new URL("/", getRequestOrigin(request));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export function attachOauthCookies(
  response: NextResponse,
  request: Request,
  input: { state: string }
): NextResponse {
  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    input.state,
    oauthCookieOptions(request)
  );
  return response;
}

export function clearOauthCookies(response: NextResponse): NextResponse {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export async function exchangeGoogleAuthorizationCode(input: {
  request: Request;
  code: string;
}): Promise<GoogleTokenSet> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth is not configured.");
  }

  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getGoogleRedirectUri(input.request),
    grant_type: "authorization_code",
  });

  return requestGoogleTokens(body);
}

export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<GoogleTokenSet> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth is not configured.");
  }

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const tokens = await requestGoogleTokens(body);
  return {
    ...tokens,
    refreshToken: tokens.refreshToken ?? refreshToken,
  };
}

export type GoogleAccountProfile = {
  id: string;
  email: string | null;
};

export async function fetchGoogleAccountProfile(
  accessToken: string
): Promise<GoogleAccountProfile | null> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[google-oauth] userinfo failed", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as { id?: string; email?: string };
  const id = data.id?.trim();
  if (!id) return null;

  return { id, email: data.email?.trim() || null };
}

export async function fetchGoogleAccountEmail(
  accessToken: string
): Promise<string | null> {
  const profile = await fetchGoogleAccountProfile(accessToken);
  return profile?.email ?? null;
}

async function requestGoogleTokens(
  body: URLSearchParams
): Promise<GoogleTokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "Google token exchange failed."
    );
  }

  const expiresInMs = Math.max(30, data.expires_in ?? 3600) * 1000;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    scope: data.scope,
  };
}
