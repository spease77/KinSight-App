import { insertTimeLog, insertTimeLogs } from "@/lib/supabase/time-logs";
import {
  dateInputToLoggedAt,
  parseDurationInput,
} from "@/lib/time-logs/format-duration";
import type { MeetingFormat } from "@/types/time-log";

const MEETING_FORMATS = new Set<MeetingFormat>([
  "in_person",
  "phone",
  "video_call",
  "reminder",
]);

function parseMeetingFormat(value: unknown): MeetingFormat | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string" && MEETING_FORMATS.has(value as MeetingFormat)) {
    return value as MeetingFormat;
  }
  return undefined;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      contactId?: string;
      contactIds?: string[];
      durationMinutes?: number;
      duration?: string;
      loggedAt?: string;
      loggedDate?: string;
      notes?: string;
      meetingFormat?: string | null;
    };

    const contactIds = [
      ...(body.contactIds ?? []),
      ...(body.contactId?.trim() ? [body.contactId.trim()] : []),
    ];

    if (contactIds.length === 0) {
      return Response.json({ error: "Contact is required." }, { status: 400 });
    }

    const durationMinutes =
      typeof body.duration === "string" && body.duration.trim()
        ? parseDurationInput(body.duration)
        : Number(body.durationMinutes);

    if (
      !durationMinutes ||
      !Number.isFinite(durationMinutes) ||
      durationMinutes === 0
    ) {
      return Response.json(
        { error: "Enter a valid duration in minutes." },
        { status: 400 }
      );
    }

    let loggedAt: string | undefined;
    if (body.loggedAt?.trim()) {
      const parsed = Date.parse(body.loggedAt);
      if (!Number.isFinite(parsed)) {
        return Response.json({ error: "Enter a valid date." }, { status: 400 });
      }
      loggedAt = new Date(parsed).toISOString();
    } else if (body.loggedDate?.trim()) {
      const iso = dateInputToLoggedAt(body.loggedDate);
      if (!iso) {
        return Response.json({ error: "Enter a valid date." }, { status: 400 });
      }
      loggedAt = iso;
    }

    const meetingFormat = parseMeetingFormat(body.meetingFormat);
    if (body.meetingFormat != null && body.meetingFormat !== "" && meetingFormat === undefined) {
      return Response.json(
        { error: "Enter a valid meeting format." },
        { status: 400 }
      );
    }

    const payload = {
      durationMinutes: Math.round(durationMinutes),
      loggedAt,
      notes: body.notes,
      meetingFormat: meetingFormat ?? null,
    };

    const result =
      contactIds.length === 1
        ? await insertTimeLog({ contactId: contactIds[0], ...payload })
        : await insertTimeLogs({ contactIds, ...payload });

    if (!result.ok) {
      return Response.json(
        { error: result.error ?? "Could not save time log." },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Time log POST error:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Could not save time log.",
      },
      { status: 500 }
    );
  }
}
