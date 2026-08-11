import { z } from "zod";
import { fetchExportDataForContacts } from "@/lib/supabase/export-data";

const exportRequestSchema = z.object({
  contactIds: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = exportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Select at least one contact to export." },
        { status: 400 }
      );
    }

    const { data, error } = await fetchExportDataForContacts(parsed.data.contactIds);

    if (error || !data) {
      return Response.json(
        { error: error ?? "Could not load export data." },
        { status: 500 }
      );
    }

    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Export POST error:", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Could not prepare export data.",
      },
      { status: 500 }
    );
  }
}
