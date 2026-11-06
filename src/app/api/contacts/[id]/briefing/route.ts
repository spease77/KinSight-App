import { generatePreMeetingBriefing } from "@/lib/services/advisorEngine";
import { isLinkedContactId } from "@/types/scheduled-interaction";

export const maxDuration = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contactId = id?.trim();
    if (!isLinkedContactId(contactId)) {
      return Response.json({ error: "Invalid contact id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const card = await generatePreMeetingBriefing({
      contactId,
      eventId: url.searchParams.get("eventId"),
      externalEventId: url.searchParams.get("externalEventId"),
      provider: url.searchParams.get("provider"),
    });

    return Response.json({ card });
  } catch (err) {
    console.error("Contact briefing GET error:", err);
    return Response.json(
      { error: "Could not load pre-meeting briefing." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contactId = id?.trim();
    if (!isLinkedContactId(contactId)) {
      return Response.json({ error: "Invalid contact id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      eventId?: string | null;
      externalEventId?: string | null;
      provider?: string | null;
      refresh?: boolean;
    };

    const card = await generatePreMeetingBriefing({
      contactId,
      eventId: body.eventId,
      externalEventId: body.externalEventId,
      provider: body.provider,
      refresh: body.refresh !== false,
    });

    return Response.json({ card });
  } catch (err) {
    console.error("Contact briefing POST error:", err);
    return Response.json(
      { error: "Could not refresh pre-meeting briefing." },
      { status: 500 }
    );
  }
}
