import { appendContactNote } from "@/lib/supabase/contacts";
import { z } from "zod";

const noteSchema = z.object({
  content: z.string().trim().min(1, "Note is required"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = noteSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid note";
      return Response.json({ error: message }, { status: 400 });
    }

    const { contact, error } = await appendContactNote(id, parsed.data.content);

    if (error || !contact) {
      return Response.json(
        { error: error ?? "Could not save note" },
        { status: 500 }
      );
    }

    return Response.json({ contact });
  } catch (err) {
    console.error("Contact note POST error:", err);
    return Response.json({ error: "Could not save note" }, { status: 500 });
  }
}
