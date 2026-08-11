import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  deleteContact,
  fetchContactById,
  updateContactIdentityFields,
  updateContactProfile,
  updateContactType,
} from "@/lib/supabase/contacts";
import { CONTACT_TYPES } from "@/lib/contacts/contact-type";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trimmedId = id?.trim();

    if (!trimmedId) {
      return Response.json({ error: "Invalid contact id" }, { status: 400 });
    }

    const { contact, error } = await fetchContactById(trimmedId);

    if (error || !contact) {
      const status = error?.toLowerCase().includes("not found") ? 404 : 500;
      return Response.json(
        { error: error ?? "Contact not found" },
        { status }
      );
    }

    return Response.json({ contact });
  } catch (err) {
    console.error("Contact GET error:", err);
    return Response.json(
      { error: "Could not load contact. Please try again." },
      { status: 500 }
    );
  }
}

const profilePatchSchema = z.object({
  profile: z.record(z.string()).optional(),
  name: z.string().trim().optional(),
  company: z.string().trim().optional(),
  contactType: z.enum(CONTACT_TYPES).nullable().optional(),
  contactTypeNeedsConfirmation: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = profilePatchSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Invalid contact data" }, { status: 400 });
    }

    if (parsed.data.profile) {
      const { contact, error } = await updateContactProfile(
        id,
        parsed.data.profile
      );

      if (error || !contact) {
        return Response.json(
          { error: error ?? "Could not save profile" },
          { status: 500 }
        );
      }

      let savedContact = contact;

      if (
        parsed.data.name !== undefined ||
        parsed.data.company !== undefined
      ) {
        const { contact: syncedContact, error: syncError } =
          await updateContactIdentityFields(id, {
            name: parsed.data.name,
            company: parsed.data.company,
          });

        if (syncError || !syncedContact) {
          return Response.json(
            { error: syncError ?? "Could not save contact name" },
            { status: 500 }
          );
        }

        savedContact = syncedContact;
      }

      if (
        parsed.data.contactType !== undefined &&
        parsed.data.contactType !== null
      ) {
        const typeResult = await updateContactType(id, parsed.data.contactType);
        if (typeResult.contact) {
          return Response.json({ contact: typeResult.contact });
        }
      }

      return Response.json({ contact: savedContact });
    }

    if (
      parsed.data.contactType !== undefined &&
      parsed.data.contactType !== null
    ) {
      const { contact, error } = await updateContactType(
        id,
        parsed.data.contactType
      );

      if (error || !contact) {
        return Response.json(
          { error: error ?? "Could not save contact type" },
          { status: 500 }
        );
      }

      return Response.json({ contact });
    }

    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  } catch (err) {
    console.error("Contact PATCH error:", err);
    return Response.json({ error: "Could not save contact" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trimmedId = id?.trim();

    if (!trimmedId) {
      return Response.json({ error: "Invalid contact id" }, { status: 400 });
    }

    const { success, error } = await deleteContact(trimmedId);

    if (!success) {
      const status = error?.toLowerCase().includes("not found") ? 404 : 500;
      return Response.json(
        { error: error ?? "Could not delete contact" },
        { status }
      );
    }

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${trimmedId}`);

    return Response.json({ success: true });
  } catch (err) {
    console.error("Contact DELETE error:", err);
    return Response.json(
      { error: "Could not delete contact. Please try again." },
      { status: 500 }
    );
  }
}
