import { z } from "zod";
import { syncPhoneContacts } from "@/lib/supabase/contacts";

const syncSchema = z.object({
  contacts: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        company: z.string().trim().optional(),
        role: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        email: z.string().trim().optional(),
      })
    )
    .min(1, "Select at least one contact to sync"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = syncSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid sync payload";
      return Response.json({ error: message }, { status: 400 });
    }

    const result = await syncPhoneContacts(parsed.data.contacts);

    console.info("[KinSight contact-sync] Server sync result", {
      added: result.added,
      merged: result.merged,
      skipped: result.skipped,
      summary: result.summary,
      error: result.error,
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({
      success: true,
      added: result.added,
      merged: result.merged,
      skipped: result.skipped,
      summary: result.summary,
    });
  } catch (err) {
    console.error("Contact sync route error:", err);
    return Response.json(
      { error: "Could not sync contacts. Please try again." },
      { status: 500 }
    );
  }
}
