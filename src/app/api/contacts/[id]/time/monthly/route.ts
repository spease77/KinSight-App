/** Legacy endpoint kept so older cached clients fail gracefully. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id?.trim()) {
      return Response.json({ error: "Contact id is required.", months: [] }, { status: 400 });
    }

    return Response.json(
      { months: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Legacy monthly time GET error:", err);
    return Response.json(
      {
        error: "Could not load chart data.",
        months: [],
      },
      { status: 500 }
    );
  }
}
