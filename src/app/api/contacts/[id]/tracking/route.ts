import { z } from "zod";
import { updateContactTrackingPaused } from "@/lib/supabase/contacts";

const patchSchema = z.object({
  isTrackingPaused: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Invalid tracking payload." }, { status: 400 });
    }

    const { contact, error } = await updateContactTrackingPaused(
      id,
      parsed.data.isTrackingPaused
    );

    if (error || !contact) {
      return Response.json(
        { error: error ?? "Could not update tracking pause." },
        { status: 500 }
      );
    }

    return Response.json({ contact });
  } catch (err) {
    console.error("Contact tracking PATCH error:", err);
    return Response.json(
      { error: "Could not update tracking pause." },
      { status: 500 }
    );
  }
}
