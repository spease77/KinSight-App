import { resolveContact } from "@/lib/services/contactResolver";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      contextCompany?: string;
      eventTitle?: string;
    };

    const result = await resolveContact({
      name: body.name,
      email: body.email,
      contextCompany: body.contextCompany,
      eventTitle: body.eventTitle,
    });

    return Response.json(result);
  } catch (err) {
    console.error("resolve contact error:", err);
    return Response.json(
      {
        contact_id: null,
        confidence_score: 0,
        needs_confirmation: false,
        candidates: [],
        error: err instanceof Error ? err.message : "Could not resolve contact",
      },
      { status: 500 }
    );
  }
}
