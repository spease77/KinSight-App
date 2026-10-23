import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";
import { readEnv } from "@/lib/supabase/server";

export const CALENDAR_SESSION_COOKIE = "kinsight_gcal_session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSessionSecret(): string {
  return (
    readEnv("GOOGLE_CALENDAR_CLIENT_SECRET") ??
    readEnv("GOOGLE_CLIENT_SECRET") ??
    readEnv("SUPABASE_SECRET_KEY") ??
    readEnv("SUPABASE_SERVICE_ROLE_KEY") ??
    readEnv("CRON_SECRET") ??
    ""
  );
}

function sign(value: string): string {
  const secret = getSessionSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function calendarUserIdFromGoogleSub(sub: string): string {
  const bytes = createHash("sha1")
    .update(`kinsight-gcal-user:${sub}`)
    .digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Per-install identity. An iOS Home Screen app and the Safari sheet that
 * Google sign-in opens do NOT share cookies, so the signed-in-with-Google
 * cookie set during connect never reached the app (Settings kept offering
 * "Connect" and no events appeared). Instead the app keeps a random device id
 * in its own cookie, sends it along when starting Connect, and the connection
 * is stored under that id, so the app can always find it again.
 */
export const CALENDAR_DEVICE_COOKIE = "kinsight_device";

const DEVICE_ID_RE = /^[A-Za-z0-9_-]{22,64}$/;

export function isValidCalendarDeviceId(value: string | null | undefined): value is string {
  return Boolean(value && DEVICE_ID_RE.test(value));
}

export function calendarUserIdFromDeviceId(deviceId: string): string {
  const bytes = createHash("sha1")
    .update(`kinsight-gcal-device:${deviceId}`)
    .digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function getCalendarDeviceUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const deviceId = cookieStore.get(CALENDAR_DEVICE_COOKIE)?.value;
  return isValidCalendarDeviceId(deviceId)
    ? calendarUserIdFromDeviceId(deviceId)
    : null;
}

export function encodeCalendarSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function decodeCalendarSession(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;

  const userId = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = sign(userId);
  if (!expected || mac.length !== expected.length) return null;

  try {
    if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  return UUID_RE.test(userId) ? userId : null;
}

export function calendarSessionCookieOptions(request: Request) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: new URL(request.url).protocol === "https:",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  };
}

export async function getCalendarSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return decodeCalendarSession(
    cookieStore.get(CALENDAR_SESSION_COOKIE)?.value
  );
}

/**
 * KinSight has no login UI yet. Prefer a signed-in Supabase user when one
 * exists; otherwise use the Google Calendar session established by Connect.
 */
export async function resolveCalendarUserId(
  request: Request
): Promise<string | null> {
  const user = await getAuthenticatedUser(request);
  if (user) return user.id;
  const deviceUserId = await getCalendarDeviceUserId();
  if (deviceUserId) return deviceUserId;
  return getCalendarSessionUserId();
}

export function attachCalendarSessionCookie(
  response: NextResponse,
  request: Request,
  userId: string
): NextResponse {
  response.cookies.set(
    CALENDAR_SESSION_COOKIE,
    encodeCalendarSession(userId),
    calendarSessionCookieOptions(request)
  );
  return response;
}

export function clearCalendarSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(CALENDAR_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
