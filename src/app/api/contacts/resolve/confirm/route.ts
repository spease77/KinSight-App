import { z } from "zod";
import { appendContactAlias } from "@/lib/supabase/contact-aliases";

const confirmSchema = z.object({
  contactId: z.string().uuid(),
  spokenName: z.string().trim().min(1),
});

export async function POST(req: Request) {
  try {
    const parsed = confirmSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const saved = await appendContactAlias(
      parsed.data.contactId,
      parsed.data.spokenName
    );

    if (saved.error) {
      return Response.json({ error: saved.error }, { status: 400 });
    }

    return Response.json({
      contact_id: parsed.data.contactId,
      aliases: saved.aliases,
    });
  } catch (err) {
    console.error("resolve confirm error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Could not save alias" },
      { status: 500 }
    );
  }
}
