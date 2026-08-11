import type { ContactDetail } from "@/types/contact";

export async function uploadContactAvatarBlob(
  contactId: string,
  blob: Blob,
  mimeType = "image/jpeg"
): Promise<{ contact?: ContactDetail; error?: string }> {
  const formData = new FormData();
  formData.append(
    "photo",
    new File([blob], "avatar.jpg", { type: mimeType })
  );

  const res = await fetch(`/api/contacts/${contactId}/avatar`, {
    method: "POST",
    body: formData,
  });

  const data = (await res.json()) as {
    contact?: ContactDetail;
    error?: string;
  };

  if (!res.ok || !data.contact) {
    return { error: data.error ?? "Could not upload photo." };
  }

  return { contact: data.contact };
}

export async function removeContactAvatar(
  contactId: string
): Promise<{ contact?: ContactDetail; error?: string }> {
  const res = await fetch(`/api/contacts/${contactId}/avatar`, {
    method: "DELETE",
  });

  const data = (await res.json()) as {
    contact?: ContactDetail;
    error?: string;
  };

  if (!res.ok || !data.contact) {
    return { error: data.error ?? "Could not remove photo." };
  }

  return { contact: data.contact };
}
