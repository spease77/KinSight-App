import { fetchOutlookAgendaInteractions } from "@/lib/calendar/outlook-events-read";
import { resolveCalendarUserId } from "@/lib/calendar/session";

export const dynamic = "force-dynamic";

/** Events from the connected Outlook account, shaped like Agenda items. */
export async function GET(request: Request) {
  const userId = await resolveCalendarUserId(request);

  if (!userId) {
    return Response.json(
      { connected: false, interactions: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const params = new URL(request.url).searchParams;
  const result = await fetchOutlookAgendaInteractions(userId, {
    timeMin: params.get("timeMin") ?? undefined,
    timeMax: params.get("timeMax") ?? undefined,
  });

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
