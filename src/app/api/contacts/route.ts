import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createContactManual, fetchContacts } from "@/lib/supabase/contacts";import { CONTACT_TYPES } from "@/lib/contacts/contact-type";
import { sanitizeContactProfile } from "@/types/contact-profile";
export async function GET() {
  try {
    const { contacts, error } = await fetchContacts();

    if (error) {
      return Response.json({ contacts: [], error, source: "error" as const });
    }

    return Response.json(
      {
        contacts,
        source: "database" as const,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("Contacts GET error:", err);
    return Response.json(
      {
        contacts: [],
        error:
          err instanceof Error ? err.message : "Could not load contacts.",
        source: "error" as const,
      },
      { status: 500 }
    );
  }
}

const createContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  company: z.string().trim().optional(),
  role: z.string().trim().optional(),
  lastContact: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  nextSteps: z.string().trim().optional(),
  topics: z.array(z.string()).optional(),
  profile: z.record(z.string()).optional(),
  contactType: z.enum(CONTACT_TYPES).nullable().optional(),
  contactTypeNeedsConfirmation: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createContactSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid contact data";
      return Response.json({ error: message }, { status: 400 });
    }

    const { contact, error } = await createContactManual({
      ...parsed.data,
      profile: sanitizeContactProfile(parsed.data.profile),
    });

    if (error || !contact) {
      return Response.json(
        { error: error ?? "Could not create contact" },
        { status: 500 }
      );
    }

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${contact.id}`);

    return Response.json({ contact }, { status: 201 });
  } catch (err) {
    console.error("Create contact error:", err);
    return Response.json(
      { error: "Could not create contact. Please try again." },
      { status: 500 }
    );
  }
}
