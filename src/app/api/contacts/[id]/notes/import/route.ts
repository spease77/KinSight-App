import { z } from "zod";
import { importContactNotesLog } from "@/lib/supabase/contacts";
import { sanitizeNotesLog } from "@/lib/contacts/notes-log";

const importSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string().optional(),
      recordedAt: z.string(),
      content: z.string().min(1),
    })
  ),
  mode: z.enum(["merge", "replace"]).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = importSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Invalid notes import data" }, { status: 400 });
    }

    const entries = sanitizeNotesLog(parsed.data.entries);
    const { contact, error, importedCount } = await importContactNotesLog(
      id,
      entries,
      parsed.data.mode ?? "merge"
    );

    if (error || !contact) {
      return Response.json(
        { error: error ?? "Could not import notes" },
        { status: 500 }
      );
    }

    return Response.json({ contact, importedCount });
  } catch (err) {
    console.error("Notes import error:", err);
    return Response.json({ error: "Could not import notes" }, { status: 500 });
  }
}
