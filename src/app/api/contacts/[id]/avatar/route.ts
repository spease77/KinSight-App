import {
  fetchContactById,
  updateContactAvatar,
  removeContactAvatar,
} from "@/lib/supabase/contacts";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const formData = await req.formData();
    const photo = formData.get("photo");

    if (!photo || !(photo instanceof Blob)) {
      return Response.json({ error: "No photo provided" }, { status: 400 });
    }

    if (!photo.type.startsWith("image/")) {
      return Response.json(
        { error: "Please upload an image file." },
        { status: 400 }
      );
    }

    if (photo.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: "Image must be 5 MB or smaller." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await photo.arrayBuffer());
    const { contact, error } = await updateContactAvatar(
      id,
      buffer,
      photo.type || "image/jpeg"
    );

    if (error || !contact) {
      return Response.json(
        { error: error ?? "Could not save profile photo" },
        { status: 500 }
      );
    }

    return Response.json({ contact });
  } catch (err) {
    console.error("Contact avatar upload error:", err);
    return Response.json(
      { error: "Could not upload profile photo" },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { contact, error } = await fetchContactById(id);

  if (error || !contact) {
    return Response.json({ error: error ?? "Contact not found" }, { status: 404 });
  }

  return Response.json({ contact });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { contact, error } = await removeContactAvatar(id);

    if (error || !contact) {
      return Response.json(
        { error: error ?? "Could not remove profile photo" },
        { status: 500 }
      );
    }

    return Response.json({ contact });
  } catch (err) {
    console.error("Contact avatar delete error:", err);
    return Response.json(
      { error: "Could not remove profile photo" },
      { status: 500 }
    );
  }
}
