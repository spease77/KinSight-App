import { NextResponse } from "next/server";
import { deleteCalendarConnection } from "@/lib/calendar/connections";
import {
  clearCalendarSessionCookie,
  resolveCalendarUserId,
} from "@/lib/calendar/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await resolveCalendarUserId(request);
  if (!userId) {
    return Response.json(
      { error: "Connect Google Calendar from Settings first." },
      { status: 401 }
    );
  }

  const result = await deleteCalendarConnection(userId, "google");
  if (result.error) {
    return Response.json(
      { error: result.error, setupRequired: result.setupRequired },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ success: true });
  return clearCalendarSessionCookie(response);
}
