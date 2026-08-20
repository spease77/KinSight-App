import { z } from "zod";
import {
  deleteAgendaItem,
  updateAgendaItem,
} from "@/lib/supabase/scheduled-interactions";

const updateAgendaSchema = z.object({
  contactId: z.string().uuid().optional(),
  scheduledAt: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateAgendaSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { interaction, error, setupRequired } = await updateAgendaItem(
      id,
      parsed.data
    );

    if (error || !interaction) {
      return Response.json(
        { error: error ?? "Could not update meeting.", setupRequired },
        { status: 500 }
      );
    }

    return Response.json({ interaction });
  } catch (err) {
    console.error("Scheduled interactions PATCH error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not update scheduled interaction.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { success, error, setupRequired } = await deleteAgendaItem(id);

    if (!success) {
      return Response.json(
        { error: error ?? "Could not delete meeting.", setupRequired },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Scheduled interactions DELETE error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not delete scheduled interaction.",
      },
      { status: 500 }
    );
  }
}
