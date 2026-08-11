import { fetchInvestmentContactSummaries } from "@/lib/supabase/time-logs";

export async function GET() {
  try {
    const { contacts, error } = await fetchInvestmentContactSummaries();

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(
      { contacts },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Time logs summary GET error:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Could not load time logs.",
      },
      { status: 500 }
    );
  }
}
