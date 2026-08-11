import { fetchContactTimeTotal } from "@/lib/supabase/time-logs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id?.trim()) {
      return Response.json({ error: "Contact id is required." }, { status: 400 });
    }

    const { totalMinutes, error } = await fetchContactTimeTotal(id);

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(
      { totalMinutes },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Contact time GET error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not load time invested.",
      },
      { status: 500 }
    );
  }
}
