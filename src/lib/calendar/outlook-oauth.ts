import { NextResponse } from "next/server";
import {
  oauthCookieOptions,
  redirectHome,
} from "@/lib/calendar/google-oauth";
import { OUTLOOK_CALENDAR_SCOPES } from "@/lib/calendar/scopes";
import { readEnv } from "@/lib/supabase/server";

export const OUTLOOK_OAUTH_STATE_COOKIE = "kinsight_outlook_oauth_state";
export { OUTLOOK_CALENDAR_SCOPES };

const AUTH_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const PROFILE_URL = "https://graph.microsoft.com/v1.0/me";

export type OutlookTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  scope?: string;
};

export function getOutlookClientId(): string | undefined {
  return (
    readEnv("OUTLOOK_CALENDAR_CLIENT_ID") ??
    readEnv("MICROSOFT_CALENDAR_CLIENT_ID") ??
    readEnv("MICROSOFT_CLIENT_ID")
  );
}

export function getOutlookClientSecret(): string | undefined {
  return (
    readEnv("OUTLOOK_CALENDAR_CLIENT_SECRET") ??
    readEnv("MICROSOFT_CALENDAR_CLIENT_SECRET") ??
    readEnv("MICROSOFT_CLIENT_SECRET")
  );
}

export function isOutlookCalendarConfigured(): boolean {
  return Boolean(getOutlookClientId() && getOutlookClientSecret());
}

export function getRequestOrigin(request: Request): string {
  return new URL(request.url).origin;
}

export function getOutlookRedirectUri(request: Request): string {
  const explicit = readEnv("OUTLOOK_CALENDAR_REDIRECT_URI");
  if (explicit) return explicit.replace(/\/$/, "");
  return `${getRequestOrigin(request)}/api/calendar/outlook/callback`;
}

export function buildOutlookAuthorizeUrl(input: {
  request: Request;
  state: string;
}): string {
  const clientId = getOutlookClientId();
  if (!clientId) {
    throw new Error("OUTLOOK_CALENDAR_CLIENT_ID is not set.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOutlookRedirectUri(input.request),
    response_type: "code",
    response_mode: "query",
    scope: OUTLOOK_CALENDAR_SCOPES,
    prompt: "consent",
    state: input.state,
  });

  return `${AUTH_URL}?${params.toString()}`;
}

export function attachOutlookOauthCookies(
  response: NextResponse,
  request: Request,
  input: { state: string }
): NextResponse {
  response.cookies.set(
    OUTLOOK_OAUTH_STATE_COOKIE,
    input.state,
    oauthCookieOptions(request)
  );
  return response;
}

export function clearOutlookOauthCookies(response: NextResponse): NextResponse {
  response.cookies.set(OUTLOOK_OAUTH_STATE_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });
  return response;
}

export function redirectOutlookHome(
  request: Request,
  params: Record<string, string>
): NextResponse {
  return redirectHome(request, { provider: "outlook", ...params });
}

export async function exchangeOutlookAuthorizationCode(input: {
  request: Request;
  code: string;
}): Promise<OutlookTokenSet> {
  const clientId = getOutlookClientId();
  const clientSecret = getOutlookClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Outlook Calendar OAuth is not configured.");
  }

  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getOutlookRedirectUri(input.request),
    grant_type: "authorization_code",
    scope: OUTLOOK_CALENDAR_SCOPES,
  });

  return requestOutlookTokens(body);
}

export async function refreshOutlookAccessToken(
  refreshToken: string
): Promise<OutlookTokenSet> {
  const clientId = getOutlookClientId();
  const clientSecret = getOutlookClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Outlook Calendar OAuth is not configured.");
  }

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    scope: OUTLOOK_CALENDAR_SCOPES,
  });

  const tokens = await requestOutlookTokens(body);
  return {
    ...tokens,
    refreshToken: tokens.refreshToken ?? refreshToken,
  };
}

export type OutlookAccountProfile = {
  id: string;
  email: string | null;
};

export async function fetchOutlookAccountProfile(
  accessToken: string
): Promise<OutlookAccountProfile | null> {
  const url = new URL(PROFILE_URL);
  url.searchParams.set("$select", "id,mail,userPrincipalName,displayName");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(
      "[outlook-oauth] profile failed",
      res.status,
      await res.text()
    );
    return null;
  }

  const data = (await res.json()) as {
    id?: string;
    mail?: string | null;
    userPrincipalName?: string | null;
  };
  const id = data.id?.trim();
  if (!id) return null;

  const email =
    data.mail?.trim() || data.userPrincipalName?.trim() || null;

  return { id, email };
}

export async function fetchOutlookAccountEmail(
  accessToken: string
): Promise<string | null> {
  const profile = await fetchOutlookAccountProfile(accessToken);
  return profile?.email ?? null;
}

async function requestOutlookTokens(
  body: URLSearchParams
): Promise<OutlookTokenSet> {
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
      data.error_description ?? data.error ?? "Outlook token exchange failed."
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
