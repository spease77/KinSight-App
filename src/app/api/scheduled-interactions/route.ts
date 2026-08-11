import { z } from "zod";
import {
  createAgendaItem,
  fetchScheduledInteractions,
} from "@/lib/supabase/scheduled-interactions";
import { resolveAgendaInteractions } from "@/lib/agenda/mock-scheduled-interactions";
import { syncMeetingToExternalCalendars } from "@/lib/calendar/sync-meeting";
import {
  buildCalendarAttendeesFromEmails,
  normalizeContactEmail,
} from "@/lib/calendar/calendar-attendees";
import { AGENDA_MEETING_TYPES } from "@/types/agenda-meeting";

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Enter a valid contact email address."
  );

const createAgendaSchema = z.object({
  contactId: z.string().uuid(),
  scheduledAt: z.string().min(1),
  scheduledEndAt: z.string().optional(),
  title: z.string().min(1),
  notes: z.string().optional(),
  meetingType: z.enum(AGENDA_MEETING_TYPES).optional(),
  pushToExternalCalendar: z.boolean().optional().default(false),
  contactEmail: optionalEmailSchema,
  contactEmails: z
    .array(
      z
        .string()
        .trim()
        .refine(
          (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
          "Enter a valid contact email address."
        )
    )
    .optional(),
});

export async function GET() {
  try {
    const { interactions, error, setupRequired } =
      await fetchScheduledInteractions();
    const resolvedInteractions = resolveAgendaInteractions(interactions);
    const usingMock =
      resolvedInteractions.length > 0 && interactions.length === 0;

    if (error) {
      return Response.json(
        { interactions: [], error, source: "error" as const },
        { status: 500 }
      );
    }

    return Response.json(
      {
        interactions: resolvedInteractions,
        setupRequired: setupRequired ?? false,
        source: usingMock ? ("mock" as const) : ("database" as const),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("Scheduled interactions GET error:", err);
    return Response.json(
      {
        interactions: [],
        error:
          err instanceof Error
            ? err.message
            : "Could not load scheduled interactions.",
        source: "error" as const,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createAgendaSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const {
      contactId,
      scheduledAt,
      scheduledEndAt,
      title,
      notes,
      meetingType,
      pushToExternalCalendar,
      contactEmail,
      contactEmails,
    } = parsed.data;

    const inviteEmails =
      contactEmails && contactEmails.length > 0
        ? contactEmails
        : contactEmail
          ? [contactEmail]
          : [];

    const { interaction, error, setupRequired } = await createAgendaItem({
      contactId,
      scheduledAt,
      title,
      notes: notes ?? null,
    });

    if (error || !interaction) {
      return Response.json(
        { error: error ?? "Could not create agenda item.", setupRequired },
        { status: 500 }
      );
    }

    if (pushToExternalCalendar) {
      void syncMeetingToExternalCalendars({
        interactionId: interaction.id,
        contactName: interaction.contactName,
        title: interaction.title,
        scheduledAt: interaction.scheduledAt,
        scheduledEndAt,
        meetingType,
        notes: interaction.notes,
        contactEmail: normalizeContactEmail(inviteEmails[0] ?? ""),
        contactEmails: inviteEmails,
        attendees: buildCalendarAttendeesFromEmails(
          inviteEmails,
          interaction.contactName
        ),
      }).catch((syncError) => {
        console.error("Background calendar sync failed:", syncError);
      });
    }

    return Response.json({ interaction }, { status: 201 });
  } catch (err) {
    console.error("Scheduled interactions POST error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not create scheduled interaction.",
      },
      { status: 500 }
    );
  }
}
