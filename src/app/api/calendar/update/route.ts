import { z } from "zod";
import { updateCalendarEvent } from "@/lib/calendar/update-event";
import { resolveCalendarUserId } from "@/lib/calendar/session";
import { INTERACTION_SOURCES } from "@/types/scheduled-interaction";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  id: z.string().min(1),
  source: z.enum(INTERACTION_SOURCES),
  externalEventId: z.string().nullable().optional(),
  calendarId: z.string().nullable().optional(),
  title: z.string().min(1),
  scheduledAt: z.string().min(1),
  scheduledEndAt: z.string().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const userId = await resolveCalendarUserId(request);
  if (!userId) {
    return Response.json(
      {
        error: "Connect your calendar in Settings, then try again.",
        needsReauth: true,
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const result = await updateCalendarEvent({
      userId,
      ...parsed.data,
    });

    if (result.error) {
      return Response.json(
        {
          error: result.error,
          needsReauth: result.needsReauth ?? false,
          updatedIn: result.updatedIn,
        },
        { status: result.needsReauth ? 401 : 500 }
      );
    }

    return Response.json({
      ok: true,
      updatedIn: result.updatedIn,
      interaction: result.interaction ?? null,
    });
  } catch (err) {
    console.error("[calendar-update]", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Could not update this event.",
      },
      { status: 500 }
    );
  }
}
