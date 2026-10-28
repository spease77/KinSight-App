import { NextResponse } from "next/server";
import {
  deleteCalendarConnection,
  hasOtherCalendarConnection,
} from "@/lib/calendar/connections";
import {
  clearCalendarSessionCookie,
  resolveCalendarUserId,
} from "@/lib/calendar/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await resolveCalendarUserId(request);
  if (!userId) {
    return Response.json(
      { error: "Connect Outlook Calendar from Settings first." },
      { status: 401 }
    );
  }

  const result = await deleteCalendarConnection(userId, "outlook");
  if (result.error) {
    return Response.json(
      { error: result.error, setupRequired: result.setupRequired },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ success: true });
  if (await hasOtherCalendarConnection(userId, "outlook")) {
    return response;
  }
  return clearCalendarSessionCookie(response);
}
